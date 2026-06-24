import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Billing (e2e)', () => {
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

  async function newDriver(email = `b_${Math.random().toString(36).slice(2)}@example.com`) {
    const agent = request.agent(app.getHttpServer());
    const su = await agent
      .post('/api/v1/auth/signup')
      .send({ name: 'Bill Driver', email, password: 'supersecret' });
    return { agent, email, id: su.body.driver.id as string };
  }

  it('GET /me/account returns inactive/not-onboarded for a new driver', async () => {
    const { agent, email } = await newDriver();
    const res = await agent.get('/api/v1/me/account');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.subscriptionStatus).toBe('none');
    expect(res.body.isActive).toBe(false);
    expect(res.body.stripeOnboarded).toBe(false);
  });

  it('PATCH /me/account updates phone; duplicate email -> 409', async () => {
    const { agent } = await newDriver();
    const { email: taken } = await newDriver();

    const up = await agent.patch('/api/v1/me/account').send({ phone: '+44 7700 900999' });
    expect(up.status).toBe(200);
    expect(up.body.phone).toBe('+44 7700 900999');

    const dup = await agent.patch('/api/v1/me/account').send({ email: taken });
    expect(dup.status).toBe(409);
  });

  it('PATCH /me/account rejects invalid contact details (400)', async () => {
    const { agent } = await newDriver();
    // bad email format
    expect((await agent.patch('/api/v1/me/account').send({ email: 'not-an-email' })).status).toBe(400);
    // phone too short
    expect((await agent.patch('/api/v1/me/account').send({ phone: '12' })).status).toBe(400);
    // phone with disallowed characters
    expect((await agent.patch('/api/v1/me/account').send({ phone: '07700abc999' })).status).toBe(400);
    // a valid update still succeeds and persists
    const ok = await agent.patch('/api/v1/me/account').send({ phone: '+44 (20) 7946 0000' });
    expect(ok.status).toBe(200);
    expect(ok.body.phone).toBe('+44 (20) 7946 0000');
  });

  it('connect onboarding (mock) marks the driver onboarded', async () => {
    const { agent, id } = await newDriver();
    const onboard = await agent.post('/api/v1/connect/onboard');
    expect(onboard.status).toBe(201);
    expect(onboard.body.url).toContain('/api/v1/connect/return');

    const ret = await agent.get(`/api/v1/connect/return?d=${id}`);
    expect(ret.status).toBe(302);

    const acc = await agent.get('/api/v1/me/account');
    expect(acc.body.stripeOnboarded).toBe(true);
  });

  it('subscription checkout + return (mock) activates the driver', async () => {
    const { agent, id } = await newDriver();
    const co = await agent.post('/api/v1/subscription/checkout');
    expect(co.status).toBe(201);
    expect(co.body.url).toContain('/api/v1/subscription/return');

    const ret = await agent.get(`/api/v1/subscription/return?d=${id}`);
    expect(ret.status).toBe(302);

    const acc = await agent.get('/api/v1/me/account');
    expect(acc.body.subscriptionStatus).toBe('active');
    expect(acc.body.isActive).toBe(true);
  });

  it('portal requires a customer; works after checkout; cancel deactivates', async () => {
    const { agent, id } = await newDriver();

    const noCust = await agent.post('/api/v1/subscription/portal');
    expect(noCust.status).toBe(404);

    await agent.post('/api/v1/subscription/checkout');
    const portal = await agent.post('/api/v1/subscription/portal');
    expect(portal.status).toBe(201);
    expect(portal.body.url).toBeTruthy();

    await agent.get(`/api/v1/subscription/return?d=${id}`);
    const cancel = await agent.post('/api/v1/subscription/cancel');
    expect(cancel.status).toBe(201);
    const acc = await agent.get('/api/v1/me/account');
    expect(acc.body.subscriptionStatus).toBe('canceled');
    expect(acc.body.isActive).toBe(false);
  });

  it('billing endpoints require auth', async () => {
    const anon = request(app.getHttpServer());
    expect((await anon.get('/api/v1/me/account')).status).toBe(401);
    expect((await anon.post('/api/v1/subscription/checkout')).status).toBe(401);
  });
});
