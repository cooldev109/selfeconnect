import { createSmsGateway, MockSmsGateway, TwilioSmsGateway } from './sms.gateway';

describe('createSmsGateway (keyless-first selection)', () => {
  const ENV = process.env;
  beforeEach(() => {
    process.env = { ...ENV };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    delete process.env.TWILIO_FROM;
  });
  afterAll(() => {
    process.env = ENV;
  });

  it('falls back to the inert mock when no Twilio env is set', () => {
    const g = createSmsGateway();
    expect(g).toBeInstanceOf(MockSmsGateway);
    expect(g.isMock).toBe(true);
  });

  it('still mocks when creds are set but no sender is configured', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    expect(createSmsGateway()).toBeInstanceOf(MockSmsGateway);
  });

  it('uses the real Twilio gateway with creds + a from-number', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_FROM = '+15555550123';
    const g = createSmsGateway();
    expect(g).toBeInstanceOf(TwilioSmsGateway);
    expect(g.isMock).toBe(false);
  });

  it('uses the real Twilio gateway with creds + a messaging service sid', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_MESSAGING_SERVICE_SID = 'MG_test';
    expect(createSmsGateway()).toBeInstanceOf(TwilioSmsGateway);
  });
});
