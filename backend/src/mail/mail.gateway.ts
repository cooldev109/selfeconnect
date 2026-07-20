export const MAIL_GATEWAY = Symbol('MAIL_GATEWAY');

export type SendEmail = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback — some clients prefer it, and it helps deliverability. */
  text?: string;
  /** Where a human reply should land (the from address is a no-reply). */
  replyTo?: string;
  /** One-click unsubscribe, for notification (non-transactional) mail. */
  unsubscribeUrl?: string;
};

export interface MailGateway {
  /** True when no provider key is configured — nothing leaves the machine. */
  readonly isMock: boolean;
  send(email: SendEmail): Promise<{ id: string }>;
}

/**
 * Used in development and tests: logs instead of sending, so a test run can
 * never email a real person. Mirrors the Stripe gateway's mock/real split.
 */
export class MockMailGateway implements MailGateway {
  readonly isMock = true;
  // Kept in memory so tests can assert what would have been sent.
  static readonly outbox: SendEmail[] = [];

  send(email: SendEmail): Promise<{ id: string }> {
    MockMailGateway.outbox.push(email);
    console.log(`[mail:mock] → ${email.to} · ${email.subject}`);
    // Without a provider there's no inbox to open, so the action link is
    // logged — otherwise reset/verify flows can't be completed locally. Mock
    // mode only: with a real key this class is never constructed.
    const link = /href="(https?:\/\/[^"]*(?:token=)[^"]*)"/.exec(email.html)?.[1];
    if (link) console.log(`[mail:mock]   link: ${link}`);
    return Promise.resolve({ id: `mock_${Date.now()}` });
  }
}

export class ResendMailGateway implements MailGateway {
  readonly isMock = false;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly defaultReplyTo?: string,
  ) {}

  async send(email: SendEmail): Promise<{ id: string }> {
    const headers: Record<string, string> = {};
    // RFC 8058: lets Gmail/Outlook show a native unsubscribe button, which
    // keeps complaints (and therefore spam placement) down.
    if (email.unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${email.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.replyTo ?? this.defaultReplyTo,
        headers: Object.keys(headers).length ? headers : undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`resend_failed_${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id ?? 'unknown' };
  }
}
