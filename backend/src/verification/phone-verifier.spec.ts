import {
  createPhoneVerifier,
  MockPhoneVerifier,
  TwilioVerifyPhoneVerifier,
  SmsRateLimiter,
} from './phone-verifier';

describe('createPhoneVerifier (keyless-first selection)', () => {
  const ENV = process.env;
  beforeEach(() => {
    process.env = { ...ENV };
    delete process.env.TWILIO_API_KEY_SID;
    delete process.env.TWILIO_API_SECRET;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
  });
  afterAll(() => {
    process.env = ENV;
  });

  it('falls back to the mock when Twilio env is incomplete', () => {
    expect(createPhoneVerifier()).toBeInstanceOf(MockPhoneVerifier);
    process.env.TWILIO_API_KEY_SID = 'SK_x';
    process.env.TWILIO_API_SECRET = 'secret';
    // no service sid yet
    expect(createPhoneVerifier()).toBeInstanceOf(MockPhoneVerifier);
  });

  it('uses Twilio Verify when key + secret + service sid are set', () => {
    process.env.TWILIO_API_KEY_SID = 'SK_x';
    process.env.TWILIO_API_SECRET = 'secret';
    process.env.TWILIO_VERIFY_SERVICE_SID = 'VA_x';
    const v = createPhoneVerifier();
    expect(v).toBeInstanceOf(TwilioVerifyPhoneVerifier);
    expect(v.isMock).toBe(false);
  });
});

describe('MockPhoneVerifier', () => {
  it('issues a dev code and checks it once', async () => {
    const v = new MockPhoneVerifier();
    const { devCode } = await v.start('+447700900001');
    expect(devCode).toMatch(/^\d{6}$/);
    expect(await v.check('+447700900001', 'bad')).toBe(false);
    expect(await v.check('+447700900001', devCode!)).toBe(true);
    // consumed after a successful check
    expect(await v.check('+447700900001', devCode!)).toBe(false);
  });
});

describe('SmsRateLimiter', () => {
  it('enforces the 60s gap and the 3-per-10-min cap', () => {
    let now = 1_000_000;
    const rl = new SmsRateLimiter(60_000, 10 * 60_000, 3, () => now);
    const phone = '+447700900002';

    expect(rl.check(phone).ok).toBe(true); // 1st
    const soon = rl.check(phone);
    expect(soon.ok).toBe(false);
    if (!soon.ok) expect(soon.reason).toBe('too_soon');

    now += 61_000;
    expect(rl.check(phone).ok).toBe(true); // 2nd
    now += 61_000;
    expect(rl.check(phone).ok).toBe(true); // 3rd
    now += 61_000;
    const over = rl.check(phone); // 4th within 10 min
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toBe('too_many');

    // after the window clears, allowed again
    now += 10 * 60_000;
    expect(rl.check(phone).ok).toBe(true);
  });

  it('is independent per phone number', () => {
    let now = 0;
    const rl = new SmsRateLimiter(60_000, 600_000, 3, () => now);
    expect(rl.check('+447700900003').ok).toBe(true);
    expect(rl.check('+447700900004').ok).toBe(true);
  });
});
