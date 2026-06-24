import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Me/tips summary (e2e)', () => {
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

  async function signedInDriver() {
    const agent = request.agent(app.getHttpServer());
    const su = await agent.post('/api/v1/auth/signup').send({
      name: 'Dash Driver',
      email: `dash_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'supersecret',
    });
    return { agent, driverId: su.body.driver.id as string };
  }

  // Insert a succeeded tip created `daysAgo` days ago.
  async function seedTip(driverId: string, amountPence: number, rating: number | null, daysAgo = 0, extra: any = {}) {
    const created = new Date();
    created.setDate(created.getDate() - daysAgo);
    return prisma.tip.create({
      data: {
        driverId,
        amount: amountPence,
        currency: 'gbp',
        rating,
        status: 'succeeded',
        createdAt: created,
        ...extra,
      },
    });
  }

  it('requires authentication (401 without cookie)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/me/tips');
    expect(res.status).toBe(401);
  });

  it('returns zeroed summary for a driver with no tips', async () => {
    const { agent } = await signedInDriver();
    const res = await agent.get('/api/v1/me/tips');
    expect(res.status).toBe(200);
    expect(res.body.tips).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.average).toBe(0);
    expect(res.body.avgRating).toBe(0);
    expect(res.body.perDay).toHaveLength(14);
    expect(res.body.fiveStarStreak).toBe(0);
  });

  it('aggregates totals, averages and converts pence to pounds', async () => {
    const { agent, driverId } = await signedInDriver();
    await seedTip(driverId, 500, 5, 0, { customerName: 'Jane', customerAddress: 'Alfama', message: 'Cheers' });
    await seedTip(driverId, 250, 4, 1);
    await seedTip(driverId, 1000, 5, 2);
    const res = await agent.get('/api/v1/me/tips');
    expect(res.body.total).toBe(17.5); // (500+250+1000)/100
    expect(res.body.average).toBeCloseTo(17.5 / 3, 2);
    expect(res.body.avgRating).toBeCloseTo((5 + 4 + 5) / 3, 1);
    expect(res.body.tips).toHaveLength(3);
    // newest first; amounts in pounds; address mapped to area
    expect(res.body.tips[0]).toMatchObject({ amount: 5, rating: 5, customerName: 'Jane', area: 'Alfama', message: 'Cheers' });
  });

  it('ignores non-succeeded tips', async () => {
    const { agent, driverId } = await signedInDriver();
    await seedTip(driverId, 500, 5, 0);
    await prisma.tip.create({ data: { driverId, amount: 9999, status: 'pending' } });
    await prisma.tip.create({ data: { driverId, amount: 8888, status: 'failed' } });
    const res = await agent.get('/api/v1/me/tips');
    expect(res.body.total).toBe(5);
    expect(res.body.tips).toHaveLength(1);
  });

  it('computes a leading 5-star streak (newest first)', async () => {
    const { agent, driverId } = await signedInDriver();
    await seedTip(driverId, 200, 5, 0);
    await seedTip(driverId, 200, 5, 1);
    await seedTip(driverId, 200, 3, 2); // breaks the streak
    await seedTip(driverId, 200, 5, 3);
    const res = await agent.get('/api/v1/me/tips');
    expect(res.body.fiveStarStreak).toBe(2);
  });

  it('only includes the signed-in driver\'s tips', async () => {
    const a = await signedInDriver();
    const b = await signedInDriver();
    await seedTip(a.driverId, 500, 5, 0);
    await seedTip(b.driverId, 9999, 5, 0);
    const res = await a.agent.get('/api/v1/me/tips');
    expect(res.body.total).toBe(5);
    expect(res.body.tips).toHaveLength(1);
  });
});
