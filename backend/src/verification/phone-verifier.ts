import { Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';

// Normalize a user-entered phone number to E.164 (what Twilio Verify requires).
// UK-first: "07595697886" → "+447595697886". Already-international numbers are
// kept as-is. Returns null if it can't be made into a plausible E.164 number.
export function toE164UK(raw: string): string | null {
  let s = (raw || '').replace(/[\s()\-.]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) {
    // already international — leave it
  } else if (s.startsWith('00')) {
    s = '+' + s.slice(2);
  } else if (s.startsWith('0')) {
    s = '+44' + s.slice(1);
  } else if (s.startsWith('44')) {
    s = '+' + s;
  } else {
    s = '+44' + s;
  }
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

// Phone verification via Twilio Verify. Verify owns the code lifecycle — it
// generates, sends, retries and checks the OTP — so the app never stores a code.
// Keyless-first, like the Stripe gateway: when the TWILIO_* env vars are set a
// real Verify-backed verifier is used; otherwise an inert in-memory mock lets
// dev + tests complete the flow (the code is surfaced as `devCode`).
export const PHONE_VERIFIER = 'PHONE_VERIFIER';

export interface PhoneVerifier {
  readonly isMock: boolean;
  /** Start a verification: Verify sends the OTP. Returns a devCode only in mock. */
  start(phone: string): Promise<{ devCode?: string }>;
  /** Check a submitted code. True = approved. */
  check(phone: string, code: string): Promise<boolean>;
}

const CODE_TTL_MS = 10 * 60 * 1000;

export class MockPhoneVerifier implements PhoneVerifier {
  readonly isMock = true;
  private readonly log = new Logger('MockPhoneVerifier');
  private readonly store = new Map<string, { code: string; exp: number }>();

  async start(phone: string): Promise<{ devCode?: string }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.store.set(phone, { code, exp: Date.now() + CODE_TTL_MS });
    this.log.log(`[mock verify] to=${phone} :: ${code}`);
    return { devCode: process.env.NODE_ENV !== 'production' ? code : undefined };
  }

  async check(phone: string, code: string): Promise<boolean> {
    const e = this.store.get(phone);
    if (!e || e.exp < Date.now()) return false;
    const ok = e.code === code;
    if (ok) this.store.delete(phone);
    return ok;
  }
}

// Real Twilio Verify. No SDK dependency — direct REST calls authenticated with a
// Twilio API Key (SID + secret) scoped to the Verify service.
export class TwilioVerifyPhoneVerifier implements PhoneVerifier {
  readonly isMock = false;
  private readonly log = new Logger('TwilioVerifyPhoneVerifier');
  constructor(
    private readonly apiKeySid: string,
    private readonly apiSecret: string,
    private readonly serviceSid: string,
  ) {}

  private headers() {
    const auth = Buffer.from(`${this.apiKeySid}:${this.apiSecret}`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  async start(phone: string): Promise<{ devCode?: string }> {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${this.serviceSid}/Verifications`,
      { method: 'POST', headers: this.headers(), body: new URLSearchParams({ To: phone, Channel: 'sms' }) },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.log.error(`Verify start failed: HTTP ${res.status} ${detail.slice(0, 200)}`);
      throw new Error('sms_send_failed');
    }
    return {};
  }

  async check(phone: string, code: string): Promise<boolean> {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${this.serviceSid}/VerificationCheck`,
      { method: 'POST', headers: this.headers(), body: new URLSearchParams({ To: phone, Code: code }) },
    );
    // 404 = no pending verification (expired / already consumed) → not approved.
    if (res.status === 404) return false;
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.log.error(`Verify check failed: HTTP ${res.status} ${detail.slice(0, 200)}`);
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    return data.status === 'approved';
  }
}

export function createPhoneVerifier(): PhoneVerifier {
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (apiKeySid && apiSecret && serviceSid) {
    return new TwilioVerifyPhoneVerifier(apiKeySid, apiSecret, serviceSid);
  }
  return new MockPhoneVerifier();
}

// Per-phone SMS rate limiting (abuse / cost protection), independent of Twilio's
// own limits: at least `minGapMs` between requests, at most `maxInWindow` per
// `windowMs`. In-memory and single-instance, which suits this deployment.
export type RateResult =
  | { ok: true }
  | { ok: false; reason: 'too_soon' | 'too_many'; retryAfterSec: number };

export class SmsRateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly minGapMs = 60 * 1000,
    private readonly windowMs = 10 * 60 * 1000,
    private readonly maxInWindow = 3,
    private readonly now: () => number = Date.now,
  ) {}

  check(phone: string): RateResult {
    const t = this.now();
    const prior = (this.hits.get(phone) ?? []).filter((x) => t - x < this.windowMs);
    const last = prior[prior.length - 1];
    if (last !== undefined && t - last < this.minGapMs) {
      return { ok: false, reason: 'too_soon', retryAfterSec: Math.ceil((this.minGapMs - (t - last)) / 1000) };
    }
    if (prior.length >= this.maxInWindow) {
      return { ok: false, reason: 'too_many', retryAfterSec: Math.ceil((this.windowMs - (t - prior[0])) / 1000) };
    }
    prior.push(t);
    this.hits.set(phone, prior);
    return { ok: true };
  }
}
