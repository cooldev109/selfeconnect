import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Singleton Stripe.js loader. Null when no publishable key is configured (e.g.
// the backend is still running in mock mode), so callers can fall back cleanly.
const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let promise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> | null {
  if (!key) return null;
  if (!promise) promise = loadStripe(key);
  return promise;
}

// For Direct charges, Stripe.js must be scoped to the connected (merchant)
// account the PaymentIntent was created on. Cached per account.
const accountPromises = new Map<string, Promise<Stripe | null>>();
export function getStripeForAccount(account: string): Promise<Stripe | null> | null {
  if (!key) return null;
  if (!accountPromises.has(account)) {
    accountPromises.set(account, loadStripe(key, { stripeAccount: account }));
  }
  return accountPromises.get(account) ?? null;
}
