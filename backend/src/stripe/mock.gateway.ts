import type { StripeGateway, AccountStatus, WebhookEvent } from './gateway';

const rid = (p: string) =>
  `${p}_mock_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

// In-memory mock: accounts are fully enabled on creation (simulates completed
// Connect onboarding). No real network/keys needed.
export class MockStripeGateway implements StripeGateway {
  readonly isMock = true;

  async createConnectAccount() {
    return { accountId: rid('acct') };
  }
  async createOnboardingLink(i: { returnUrl: string }) {
    return { url: i.returnUrl };
  }
  async getAccountStatus(): Promise<AccountStatus> {
    return { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
  }
  async createSubscriptionCheckout(i: {
    customerId?: string;
    successUrl: string;
  }) {
    return { url: i.successUrl, customerId: i.customerId ?? rid('cus') };
  }
  async createBillingPortalSession(i: { returnUrl: string }) {
    return { url: i.returnUrl };
  }
  async createTipPaymentIntent() {
    const id = rid('pi');
    return { paymentIntentId: id, clientSecret: `${id}_secret_mock` };
  }
  constructWebhookEvent(payload: string | Buffer): WebhookEvent {
    const parsed = JSON.parse(payload.toString());
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      throw new Error('invalid event');
    }
    return {
      id: typeof parsed.id === 'string' ? parsed.id : rid('evt'),
      type: parsed.type,
      data: parsed.data ?? { object: {} },
    };
  }
}
