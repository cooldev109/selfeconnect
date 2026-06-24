import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tips (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  // Create a driver and (optionally) make it active + onboarded.
  async function makeDriver(accepting: boolean) {
    const agent = request.agent(app.getHttpServer());
    const su = await agent.post('/api/v1/auth/signup').send({
      name: 'Tip Driver',
      email: `t_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'supersecret',
    });
    const publicId = su.body.driver.publicId;
    const id = su.body.driver.id;
    if (accepting) {
      await agent.post('/api/v1/connect/onboard');
      await agent.get(`/api/v1/connect/return?d=${id}`);
      await agent.post('/api/v1/subscription/checkout');
      await agent.get(`/api/v1/subscription/return?d=${id}`);
    }
    return publicId;
  }

  const http = () => request(app.getHttpServer());

  it('creates a tip for an accepting driver (succeeded in mock)', async () => {
    const publicId = await makeDriver(true);
    const res = await http()
      .post(`/api/v1/drivers/${publicId}/tips`)
      .send({ amount: 200, rating: 5, customerName: 'Jane', message: 'Cheers!' });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(200);
    expect(res.body.paymentIntentId).toMatch(/^pi_mock_/);
    expect(res.body.mock).toBe(true);

    const tips = await prisma.tip.findMany();
    expect(tips).toHaveLength(1);
    expect(tips[0]).toMatchObject({
      amount: 200,
      status: 'succeeded',
      rating: 5,
      customerName: 'Jane',
      message: 'Cheers!',
    });
  });

  it('blocks tips for a driver not active/onboarded (409)', async () => {
    const publicId = await makeDriver(false);
    const res = await http()
      .post(`/api/v1/drivers/${publicId}/tips`)
      .send({ amount: 200 });
    expect(res.status).toBe(409);
    expect((await prisma.tip.count())).toBe(0);
  });

  it('404 for an unknown driver', async () => {
    const res = await http().post('/api/v1/drivers/ZZZZZ/tips').send({ amount: 200 });
    expect(res.status).toBe(404);
  });

  it('rejects invalid amounts', async () => {
    const publicId = await makeDriver(true);
    expect((await http().post(`/api/v1/drivers/${publicId}/tips`).send({ amount: 10 })).status).toBe(400);
    expect((await http().post(`/api/v1/drivers/${publicId}/tips`).send({ amount: 60000 })).status).toBe(400);
    expect((await http().post(`/api/v1/drivers/${publicId}/tips`).send({ amount: 200, rating: 9 })).status).toBe(400);
    expect(await prisma.tip.count()).toBe(0);
  });
});
