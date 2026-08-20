import { subscriptionPeriodEnd } from './subscription-period';
import Stripe from 'stripe';
import type { StripeGateway, AccountStatus, WebhookEvent } from './gateway';

// Express + Stripe-handled pricing is currently a Stripe public preview, so the
// v2 account calls must run on the preview API version. It's not in the stable
// SDK's typed version union, so the config is cast; pinned so it can't drift.
const ACCOUNTS_V2_PREVIEW = '2026-07-29.preview';
type StripeConfig = ConstructorParameters<typeof Stripe>[1];

// Real Stripe-backed gateway (used when STRIPE_SECRET_KEY is set).
export class RealStripeGateway implements StripeGateway {
  readonly isMock = false;
  private stripe: Stripe;
  // A second client pinned to the preview API version, used ONLY for the v2
  // Accounts calls — everything else stays on the stable API version.
  private accounts: Stripe;
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
    this.accounts = new Stripe(secretKey, {
      apiVersion: ACCOUNTS_V2_PREVIEW,
    } as unknown as StripeConfig);
  }

  // v2 Accounts API. The professional's account is a `merchant` (merchant of
  // record via Direct charges) on an **Express** dashboard, with
  // `fees_collector: 'stripe'` + `losses_collector: 'stripe'` — so the pro's
  // account bears Stripe's processing fees AND the negative-balance risk, the
  // platform pays nothing per transaction and no per-active-account fee, and
  // the pro keeps the lightweight Express onboarding/dashboard. (This combo is
  // only accepted on the preview API version above.)
  async createConnectAccount(i: { email: string; driverId: string }) {
    const a = await this.accounts.v2.core.accounts.create({
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
      dashboard: 'express',
      metadata: { driverId: i.driverId },
    });
    return { accountId: a.id };
  }
  async createOnboardingLink(i: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }) {
    const l = await this.accounts.v2.core.accountLinks.create({
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
    const a = await this.accounts.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant', 'requirements'],
    });
    const status = a.configuration?.merchant?.capabilities?.card_payments?.status;
    const active = status === 'active';
    return {
      // A merchant that can accept card payments can receive money and pay out.
      chargesEnabled: active,
      payoutsEnabled: active,
      detailsSubmitted: status != null && status !== 'restricted',
    };
  }
  async createDashboardLink(accountId: string) {
    // Express accounts get a one-time, platform-minted login link to their
    // Stripe Express dashboard (balance, payouts, bank details).
    const l = await this.stripe.accounts.createLoginLink(accountId);
    return { url: l.url };
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
    receiptEmail?: string;
  }) {
    // Direct charge: created ON the pro's connected account (Stripe-Account
    // header), so they're the merchant of record and bear Stripe's fee. Card +
    // wallets only (no redirect methods), for a one-tap inline payment.
    // `receipt_email` tells Stripe to email the customer a receipt on success.
    const pi = await this.stripe.paymentIntents.create(
      {
        amount: i.amount,
        currency: i.currency,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: i.metadata,
        ...(i.receiptEmail ? { receipt_email: i.receiptEmail } : {}),
      },
      { stripeAccount: i.connectedAccountId },
    );
    return {
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret ?? '',
      connectedAccountId: i.connectedAccountId,
    };
  }

  async getReceiptUrl(i: { paymentIntentId: string; connectedAccountId: string }) {
    // The charge lives on the connected account (direct charge), so retrieve
    // with its Stripe-Account header and read the hosted receipt URL.
    const pi = await this.stripe.paymentIntents.retrieve(
      i.paymentIntentId,
      { expand: ['latest_charge'] },
      { stripeAccount: i.connectedAccountId },
    );
    const charge = pi.latest_charge;
    const receiptUrl =
      charge && typeof charge !== 'string' ? (charge.receipt_url ?? null) : null;
    return { receiptUrl };
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
