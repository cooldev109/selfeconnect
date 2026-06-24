import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Drivers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.tip.deleteMany();
    await prisma.driver.deleteMany();
  });
  afterAll(async () => {
    await prisma.tip.deleteMany();
    await prisma.driver.deleteMany();
    await app.close();
  });

  const signup = (over: Record<string, unknown> = {}) => {
    const agent = request.agent(app.getHttpServer());
    return {
      agent,
      done: agent.post('/api/v1/auth/signup').send({
        name: 'João Silva',
        email: `d_${Math.random().toString(36).slice(2)}@example.com`,
        password: 'supersecret',
        company: 'Lisbon Express',
        ...over,
      }),
    };
  };

  it('GET /me returns the driver shape (id = publicId) and requires auth', async () => {
    const { agent, done } = signup();
    const su = await done;
    const publicId = su.body.driver.publicId;

    const me = await agent.get('/api/v1/me');
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(publicId);
    expect(me.body.name).toBe('João Silva');
    expect(me.body.firstName).toBe('João');
    expect(me.body.company).toBe('Lisbon Express');
    expect(me.body.rating).toBe(0);
    expect(me.body.ratingsCount).toBe(0);

    const anon = await request(app.getHttpServer()).get('/api/v1/me');
    expect(anon.status).toBe(401);
  });

  it('PATCH /me updates editable fields', async () => {
    const { agent, done } = signup();
    await done;
    const res = await agent
      .patch('/api/v1/me')
      .send({ name: 'Maria Santos', company: 'RapidVan' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Maria Santos');
    expect(res.body.firstName).toBe('Maria');
    expect(res.body.company).toBe('RapidVan');
  });

  it('GET /drivers/:publicId is public and 404s for unknown', async () => {
    const { done } = signup();
    const su = await done;
    const publicId = su.body.driver.publicId;

    const pub = await request(app.getHttpServer()).get(
      `/api/v1/drivers/${publicId}`,
    );
    expect(pub.status).toBe(200);
    expect(pub.body.id).toBe(publicId);
    expect(pub.body.email).toBeUndefined(); // public-safe

    const missing = await request(app.getHttpServer()).get(
      '/api/v1/drivers/ZZZZZ',
    );
    expect(missing.status).toBe(404);
  });

  it('POST /me/photo accepts an image and returns a photoUrl', async () => {
    const { agent, done } = signup();
    await done;
    const png = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#1D9E75' },
    })
      .png()
      .toBuffer();

    const res = await agent
      .post('/api/v1/me/photo')
      .attach('file', png, { filename: 'me.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.photoUrl).toContain('/api/v1/uploads/');
  });
});
