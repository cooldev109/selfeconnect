import Stripe from 'stripe';
import type { StripeGateway, AccountStatus, WebhookEvent } from './gateway';

// Real Stripe-backed gateway (used when STRIPE_SECRET_KEY is set).
export class RealStripeGateway implements StripeGateway {
  readonly isMock = false;
  private stripe: Stripe;
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createConnectAccount(i: { email: string; driverId: string }) {
    // Controller-based account (Express dashboard, Stripe-hosted onboarding).
    // The platform owns the payment and losses; the driver receives tips via
    // destination charges. Stripe requires `card_payments` to be requested
    // alongside `transfers` (requesting transfers alone needs special platform
    // approval), so we request both — payments still settle on the platform.
    const a = await this.stripe.accounts.create({
      controller: {
        stripe_dashboard: { type: 'express' },
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        requirement_collection: 'stripe',
      },
      country: 'GB',
      email: i.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { driverId: i.driverId },
    });
    return { accountId: a.id };
  }
  async createOnboardingLink(i: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }) {
    const l = await this.stripe.accountLinks.create({
      account: i.accountId,
      return_url: i.returnUrl,
      refresh_url: i.refreshUrl,
      type: 'account_onboarding',
    });
    return { url: l.url };
  }
  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    const a = await this.stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: Boolean(a.charges_enabled),
      payoutsEnabled: Boolean(a.payouts_enabled),
      detailsSubmitted: Boolean(a.details_submitted),
    };
  }
  async createSubscriptionCheckout(i: {
    customerId?: string;
    email: string;
    priceId: string;
    driverId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    let customerId = i.customerId;
    if (!customerId) {
      const c = await this.stripe.customers.create({
        email: i.email,
        metadata: { driverId: i.driverId },
      });
      customerId = c.id;
    }
    const s = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: i.priceId, quantity: 1 }],
      success_url: i.successUrl,
      cancel_url: i.cancelUrl,
      metadata: { driverId: i.driverId },
    });
    return { url: s.url ?? '', customerId };
  }
  async createBillingPortalSession(i: { customerId: string; returnUrl: string }) {
    const s = await this.stripe.billingPortal.sessions.create({
      customer: i.customerId,
      return_url: i.returnUrl,
    });
    return { url: s.url };
  }
  async createTipPaymentIntent(i: {
    amount: number;
    currency: string;
    destinationAccountId: string;
    metadata?: Record<string, string>;
  }) {
    const pi = await this.stripe.paymentIntents.create({
      amount: i.amount,
      currency: i.currency,
      // Card + wallets (Apple Pay / Google Pay), but no redirect-based methods
      // (klarna/revolut/amazon) — keeps the tip a one-tap, inline payment with
      // no return_url round-trip, which is what froze the old flow.
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      transfer_data: { destination: i.destinationAccountId },
      metadata: i.metadata,
    });
    return { paymentIntentId: pi.id, clientSecret: pi.client_secret ?? '' };
  }
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string | null,
  ): WebhookEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
    if (!signature) throw new Error('missing signature');
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      secret,
    ) as unknown as WebhookEvent;
  }
}
