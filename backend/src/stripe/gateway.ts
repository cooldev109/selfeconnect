export type AccountStatus = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type WebhookEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export const STRIPE_GATEWAY = Symbol('STRIPE_GATEWAY');

export interface StripeGateway {
  readonly isMock: boolean;

  createConnectAccount(input: {
    email: string;
    driverId: string;
  }): Promise<{ accountId: string }>;
  createOnboardingLink(input: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{ url: string }>;
  getAccountStatus(accountId: string): Promise<AccountStatus>;

  // One-time login link to the professional's Stripe Express dashboard, where
  // they see their balance, payout history and bank details, and can withdraw.
  createDashboardLink(accountId: string): Promise<{ url: string }>;

  createSubscriptionCheckout(input: {
    customerId?: string;
    email: string;
    priceId: string;
    driverId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; customerId: string }>;
  createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  cancelSubscriptionAtPeriodEnd(
    subscriptionId: string,
  ): Promise<{ currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean }>;

  // A Direct charge created ON the connected (merchant) account, so the pro is
  // the merchant of record and their account bears Stripe's processing fee.
  // The client secret belongs to the connected account, so the frontend must
  // initialise Stripe.js with `stripeAccount: connectedAccountId`.
  createConnectedPaymentIntent(input: {
    amount: number;
    currency: string;
    connectedAccountId: string;
    metadata?: Record<string, string>;
    // Set → Stripe emails the customer a receipt for a successful charge.
    receiptEmail?: string;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    connectedAccountId: string;
  }>;

  // The Stripe-hosted receipt page for a completed direct charge (null until
  // the charge has succeeded, or in mock mode).
  getReceiptUrl(input: {
    paymentIntentId: string;
    connectedAccountId: string;
  }): Promise<{ receiptUrl: string | null }>;

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string | null,
  ): WebhookEvent;
}
