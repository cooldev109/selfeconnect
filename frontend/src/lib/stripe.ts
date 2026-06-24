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
