import { subscriptionPeriodEnd } from './subscription-period';
import Stripe from 'stripe';
import type { StripeGateway, AccountStatus, WebhookEvent } from './gateway';

// Real Stripe-backed gateway (used when STRIPE_SECRET_KEY is set).
export class RealStripeGateway implements StripeGateway {
  readonly isMock = false;
  private stripe: Stripe;
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  // v2 Accounts API. The professional's account is a `merchant` (merchant of
  // record via Direct charges) with a full Stripe dashboard, and — crucially —
  // `fees_collector: 'stripe'` + `losses_collector: 'stripe'`, so the pro's
  // account bears Stripe's processing fees and the platform pays nothing per
  // transaction and no per-active-account fee. (Express dashboards can't carry
  // stripe-collected fees; `full` is the least-work config that can.)
  async createConnectAccount(i: { email: string; driverId: string }) {
    const a = await this.stripe.v2.core.accounts.create({
      contact_email: i.email,
      identity: { country: 'gb' },
      configuration: {
        merchant: { capabilities: { card_payments: { requested: true } } },
      },
      defaults: {
        responsibilities: {
          fees_collector: 'stripe',
          losses_collector: 'stripe',
        },
        locales: ['en-GB'],
      },
      dashboard: 'full',
      metadata: { driverId: i.driverId },
    });
    return { accountId: a.id };
  }
  async createOnboardingLink(i: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }) {
    const l = await this.stripe.v2.core.accountLinks.create({
      account: i.accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant'],
          return_url: i.returnUrl,
          refresh_url: i.refreshUrl,
        },
      },
    });
    return { url: l.url ?? '' };
  }
  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    const a = await this.stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant', 'requirements'],
    });
    const status = a.configuration?.merchant?.capabilities?.card_payments?.status;
    const active = status === 'active';
    return {
      // A merchant that can accept card payments can receive money and (as a
      // full-dashboard/Standard account) manages its own payouts.
      chargesEnabled: active,
      payoutsEnabled: active,
      detailsSubmitted: status != null && status !== 'restricted',
    };
  }
  async createDashboardLink(_accountId: string) {
    // Full-dashboard (Standard) accounts sign in to their own Stripe dashboard
    // directly — there is no platform-minted Express login link.
    return { url: 'https://dashboard.stripe.com/' };
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
  async cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
    const s = (await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })) as unknown as { cancel_at_period_end: boolean };
    // `current_period_end` lives on the subscription item in newer API
    // versions — read it version-safely so we never build an Invalid Date.
    return {
      currentPeriodEnd: subscriptionPeriodEnd(s) ?? null,
      cancelAtPeriodEnd: s.cancel_at_period_end,
    };
  }
  async createConnectedPaymentIntent(i: {
    amount: number;
    currency: string;
    connectedAccountId: string;
    metadata?: Record<string, string>;
  }) {
    // Direct charge: created ON the pro's connected account (Stripe-Account
    // header), so they're the merchant of record and bear Stripe's fee. Card +
    // wallets only (no redirect methods), for a one-tap inline payment.
    const pi = await this.stripe.paymentIntents.create(
      {
        amount: i.amount,
        currency: i.currency,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: i.metadata,
      },
      { stripeAccount: i.connectedAccountId },
    );
    return {
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret ?? '',
      connectedAccountId: i.connectedAccountId,
    };
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
