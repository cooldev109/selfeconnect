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

  createTipPaymentIntent(input: {
    amount: number;
    currency: string;
    destinationAccountId: string;
    metadata?: Record<string, string>;
  }): Promise<{ paymentIntentId: string; clientSecret: string }>;

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string | null,
  ): WebhookEvent;
}
