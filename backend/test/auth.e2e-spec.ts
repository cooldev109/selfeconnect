import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
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

  const valid = {
    name: 'Jane Driver',
    email: 'jane@example.com',
    password: 'supersecret',
    phone: '+44 7700 900111',
    company: 'Lisbon Express',
  };

  const http = () => request(app.getHttpServer());

  it('signs up, sets a cookie, and returns a driver with a publicId', async () => {
    const res = await http().post('/api/v1/auth/signup').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.driver.email).toBe('jane@example.com');
    expect(res.body.driver.publicId).toHaveLength(5);
    expect(res.body.driver.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toContain('tv_session=');
  });

  it('rejects a duplicate email with 409', async () => {
    await http().post('/api/v1/auth/signup').send(valid);
    const res = await http().post('/api/v1/auth/signup').send(valid);
    expect(res.status).toBe(409);
  });

  it('rejects a weak password with 400', async () => {
    const res = await http()
      .post('/api/v1/auth/signup')
      .send({ ...valid, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await http().post('/api/v1/auth/signup').send(valid);

    const bad = await http()
      .post('/api/v1/auth/login')
      .send({ email: valid.email, password: 'wrong' });
    expect(bad.status).toBe(401);

    const good = await http()
      .post('/api/v1/auth/login')
      .send({ email: valid.email, password: valid.password });
    expect(good.status).toBe(201);
    expect(good.headers['set-cookie'][0]).toContain('tv_session=');
  });

  it('GET /auth/me requires a session and returns the driver with one', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/signup').send(valid);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.driver.email).toBe('jane@example.com');

    const anon = await http().get('/api/v1/auth/me');
    expect(anon.status).toBe(401);
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/signup').send(valid);
    await agent.post('/api/v1/auth/logout');
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(401);
  });
});
