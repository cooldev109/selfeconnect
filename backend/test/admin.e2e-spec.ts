import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin (e2e)', () => {
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

  async function signup(role: 'driver' | 'admin' = 'driver') {
    const agent = request.agent(app.getHttpServer());
    const su = await agent.post('/api/v1/auth/signup').send({
      name: role === 'admin' ? 'Boss' : 'Driver',
      email: `${role}_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'supersecret',
    });
    const id = su.body.driver.id as string;
    if (role === 'admin') {
      await prisma.driver.update({ where: { id }, data: { role: 'admin' } });
    }
    return { agent, id };
  }

  async function makeActiveDriver() {
    const { agent, id } = await signup('driver');
    await agent.post('/api/v1/subscription/checkout');
    await agent.get(`/api/v1/subscription/return?d=${id}`);
    return { agent, id };
  }

  it('admin endpoints require authentication (401)', async () => {
    const http = request(app.getHttpServer());
    expect((await http.get('/api/v1/admin/overview')).status).toBe(401);
    expect((await http.get('/api/v1/admin/drivers')).status).toBe(401);
    expect((await http.get('/api/v1/admin/transactions')).status).toBe(401);
  });

  it('forbids non-admin drivers (403)', async () => {
    const { agent } = await signup('driver');
    expect((await agent.get('/api/v1/admin/overview')).status).toBe(403);
    expect((await agent.get('/api/v1/admin/drivers')).status).toBe(403);
    expect((await agent.get('/api/v1/admin/transactions')).status).toBe(403);
  });

  it('overview computes real aggregates (pence→£, revenue=activeSubs×9.99)', async () => {
    const { id: activeId } = await makeActiveDriver(); // 1 active sub
    await signup('driver'); // 1 inactive driver
    const admin = await signup('admin');

    // two succeeded tips + one pending (ignored)
    await prisma.tip.create({ data: { driverId: activeId, amount: 500, rating: 5, status: 'succeeded' } });
    await prisma.tip.create({ data: { driverId: activeId, amount: 250, rating: 4, status: 'succeeded' } });
    await prisma.tip.create({ data: { driverId: activeId, amount: 999, status: 'pending' } });

    const res = await admin.agent.get('/api/v1/admin/overview');
    expect(res.status).toBe(200);
    // 2 drivers + the admin is role=admin so excluded
    expect(res.body.totalDrivers).toBe(2);
    expect(res.body.activeSubs).toBe(1);
    expect(res.body.totalTipsProcessed).toBe(7.5); // (500+250)/100
    expect(res.body.platformRevenue).toBe(5.49); // 1 × 5.49
    expect(res.body.monthly).toHaveLength(6);
  });

  it('drivers list maps real records with tip aggregates', async () => {
    const { id } = await makeActiveDriver();
    await prisma.driver.update({ where: { id }, data: { phone: '+44 7700 900111', company: 'RapidVan' } });
    await prisma.tip.create({ data: { driverId: id, amount: 500, rating: 5, status: 'succeeded' } });
    await prisma.tip.create({ data: { driverId: id, amount: 300, rating: 3, status: 'succeeded' } });
    const admin = await signup('admin');

    const res = await admin.agent.get('/api/v1/admin/drivers');
    expect(res.status).toBe(200);
    // only role=driver drivers (admin excluded)
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      status: 'active',
      totalTips: 8, // (500+300)/100
      avgRating: 4, // (5+3)/2
      phone: '+44 7700 900111',
      company: 'RapidVan',
    });
    expect(res.body[0].id).toMatch(/^[A-Z0-9]{5}$/); // publicId, not internal uuid
  });

  it('transactions list returns mapped tips newest-first', async () => {
    const { id } = await makeActiveDriver();
    const older = new Date(); older.setDate(older.getDate() - 2);
    await prisma.tip.create({ data: { driverId: id, amount: 200, rating: 4, status: 'succeeded', createdAt: older, customerName: 'Tom' } });
    await prisma.tip.create({ data: { driverId: id, amount: 500, rating: 5, status: 'succeeded', customerName: 'Sarah' } });
    const admin = await signup('admin');

    const res = await admin.agent.get('/api/v1/admin/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ amount: 5, customerName: 'Sarah', driverName: 'Driver', status: 'succeeded' });
    expect(res.body[1]).toMatchObject({ amount: 2, customerName: 'Tom' });
  });
});
