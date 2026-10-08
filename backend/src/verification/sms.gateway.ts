import { Injectable, Logger } from '@nestjs/common';

// Keyless-first, like the Stripe/mail gateways: with no SMS provider configured
// the gateway is inert (the mock) and the phone-verification code is returned to
// the caller in non-production so dev + tests can complete the flow. When the
// TWILIO_* env vars are set, a real Twilio-backed gateway is used instead and a
// genuine text is sent — the same interface, selected at startup.
export const SMS_GATEWAY = 'SMS_GATEWAY';

export interface SmsGateway {
  readonly isMock: boolean;
  send(to: string, message: string): Promise<void>;
}

@Injectable()
export class MockSmsGateway implements SmsGateway {
  readonly isMock = true;
  private readonly log = new Logger('MockSmsGateway');
  async send(to: string, message: string): Promise<void> {
    this.log.log(`[mock sms] to=${to} :: ${message}`);
  }
}

// Real SMS via Twilio's REST API. No SDK dependency — a direct form-encoded POST
// with HTTP Basic auth. A sender is required: a Messaging Service SID (preferred,
// handles sender pools/compliance) or a single from-number.
export class TwilioSmsGateway implements SmsGateway {
  readonly isMock = false;
  private readonly log = new Logger('TwilioSmsGateway');
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly sender: { messagingServiceSid?: string; from?: string },
  ) {}

  async send(to: string, message: string): Promise<void> {
    const body = new URLSearchParams({ To: to, Body: message });
    if (this.sender.messagingServiceSid) {
      body.set('MessagingServiceSid', this.sender.messagingServiceSid);
    } else if (this.sender.from) {
      body.set('From', this.sender.from);
    }
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!res.ok) {
      // Log the provider error (not the code/message body) and fail loudly so the
      // caller surfaces it rather than silently "sending" nothing.
      const detail = await res.text().catch(() => '');
      this.log.error(`Twilio send failed: HTTP ${res.status} ${detail.slice(0, 300)}`);
      throw new Error('sms_send_failed');
    }
  }
}

// Selects the real Twilio gateway when credentials + a sender are configured,
// otherwise the inert mock. Mirrors the Stripe gateway's keyless-first selection,
// so going live is purely a matter of setting the env vars — no code change.
export function createSmsGateway(): SmsGateway {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM;
  if (sid && token && (messagingServiceSid || from)) {
    return new TwilioSmsGateway(sid, token, { messagingServiceSid, from });
  }
  return new MockSmsGateway();
}
