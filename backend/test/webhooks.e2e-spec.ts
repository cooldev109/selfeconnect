import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Webhooks (e2e)', () => {
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
    await prisma.webhookEvent.deleteMany();
    await prisma.tip.deleteMany();
    await prisma.driver.deleteMany();
  });
  afterAll(async () => {
    await prisma.webhookEvent.deleteMany();
    await prisma.tip.deleteMany();
    await prisma.driver.deleteMany();
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const send = (event: object) =>
    http().post('/api/v1/stripe/webhook').send(event);

  let n = 0;
  // Distinct ids per call so idempotency doesn't swallow unrelated test events.
  const evtId = () => `evt_test_${Date.now()}_${n++}`;

  async function makeDriver(extra: Record<string, unknown> = {}) {
    return prisma.driver.create({
      data: {
        publicId: `W${n++}AAA`.slice(0, 5),
        email: `wh_${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: 'x',
        name: 'WH Driver',
        ...extra,
      },
    });
  }
  async function makeTip(driverId: string, pi: string) {
    return prisma.tip.create({
      data: { driverId, amount: 500, status: 'pending', stripePaymentIntentId: pi },
    });
  }

  it('payment_intent.succeeded flips a pending tip to succeeded', async () => {
    const d = await makeDriver();
    const pi = 'pi_test_ok';
    await makeTip(d.id, pi);
    const res = await send({
      id: evtId(),
      type: 'payment_intent.succeeded',
      data: { object: { id: pi } },
    });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    const tip = await prisma.tip.findFirst({ where: { stripePaymentIntentId: pi } });
    expect(tip?.status).toBe('succeeded');
  });

  it('payment_intent.payment_failed flips a tip to failed', async () => {
    const d = await makeDriver();
    const pi = 'pi_test_fail';
    await makeTip(d.id, pi);
    await send({ id: evtId(), type: 'payment_intent.payment_failed', data: { object: { id: pi } } });
    const tip = await prisma.tip.findFirst({ where: { stripePaymentIntentId: pi } });
    expect(tip?.status).toBe('failed');
  });

  it('charge.refunded flips the tip (by payment_intent) to refunded', async () => {
    const d = await makeDriver();
    const pi = 'pi_test_refund';
    await prisma.tip.create({
      data: { driverId: d.id, amount: 500, status: 'succeeded', stripePaymentIntentId: pi },
    });
    await send({
      id: evtId(),
      type: 'charge.refunded',
      data: { object: { id: 'ch_1', payment_intent: pi } },
    });
    const tip = await prisma.tip.findFirst({ where: { stripePaymentIntentId: pi } });
    expect(tip?.status).toBe('refunded');
  });

  it('account.updated sets stripeOnboarded from charges/payouts enabled', async () => {
    const d = await makeDriver({ stripeAccountId: 'acct_wh_1', stripeOnboarded: false });
    await send({
      id: evtId(),
      type: 'account.updated',
      data: { object: { id: 'acct_wh_1', charges_enabled: true, payouts_enabled: true } },
    });
    expect((await prisma.driver.findUnique({ where: { id: d.id } }))?.stripeOnboarded).toBe(true);

    await send({
      id: evtId(),
      type: 'account.updated',
      data: { object: { id: 'acct_wh_1', charges_enabled: true, payouts_enabled: false } },
    });
    expect((await prisma.driver.findUnique({ where: { id: d.id } }))?.stripeOnboarded).toBe(false);
  });

  it('checkout.session.completed activates the driver (by metadata.driverId)', async () => {
    const d = await makeDriver({ subscriptionStatus: 'none', isActive: false });
    await send({
      id: evtId(),
      type: 'checkout.session.completed',
      data: {
        object: { mode: 'subscription', customer: 'cus_wh_1', metadata: { driverId: d.id } },
      },
    });
    const after = await prisma.driver.findUnique({ where: { id: d.id } });
    expect(after?.subscriptionStatus).toBe('active');
    expect(after?.isActive).toBe(true);
    expect(after?.stripeCustomerId).toBe('cus_wh_1');
  });

  it('customer.subscription.deleted cancels and deactivates (by customer id)', async () => {
    const d = await makeDriver({
      stripeCustomerId: 'cus_wh_2',
      subscriptionStatus: 'active',
      isActive: true,
    });
    await send({
      id: evtId(),
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_wh_2', status: 'canceled' } },
    });
    const after = await prisma.driver.findUnique({ where: { id: d.id } });
    expect(after?.subscriptionStatus).toBe('canceled');
    expect(after?.isActive).toBe(false);
  });

  it('is idempotent: a repeated event id is not processed twice', async () => {
    const d = await makeDriver();
    const pi = 'pi_test_idem';
    await makeTip(d.id, pi);
    const id = evtId();
    const e = { id, type: 'payment_intent.succeeded', data: { object: { id: pi } } };
    const first = await send(e);
    expect(first.body.duplicate).toBeUndefined();
    // Manually regress the tip, then replay the same event id.
    await prisma.tip.updateMany({ where: { stripePaymentIntentId: pi }, data: { status: 'pending' } });
    const second = await send(e);
    expect(second.body.duplicate).toBe(true);
    const tip = await prisma.tip.findFirst({ where: { stripePaymentIntentId: pi } });
    expect(tip?.status).toBe('pending'); // not re-applied
  });

  it('rejects a malformed event (no type) with 400', async () => {
    const res = await send({ not: 'an event' });
    expect(res.status).toBe(400);
  });
});
