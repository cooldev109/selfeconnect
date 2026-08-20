import { api } from "./api";

export interface AccountInfo {
  email: string;
  phone: string;
  /** The monthly rate this professional is actually billed. */
  priceGbp: number;
  /** True if they hold one of the launch places and keep the lower rate. */
  foundingMember: boolean;
  subscriptionStatus: string;
  isActive: boolean;
  stripeOnboarded: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  /** Admin-granted free launch access (no Stripe subscription). */
  complimentary: boolean;
  complimentaryUntil: string | null;
}

export const getAccount = () => api<AccountInfo>("/me/account");
export const updateContact = (b: { email?: string; phone?: string }) =>
  api<AccountInfo>("/me/account", { method: "PATCH", body: JSON.stringify(b) });
export const startCheckout = () =>
  api<{ url: string }>("/subscription/checkout", { method: "POST" });
export const startPortal = () =>
  api<{ url: string }>("/subscription/portal", { method: "POST" });
export const cancelSubscription = () =>
  api<{ ok: true }>("/subscription/cancel", { method: "POST" });
export const startConnect = () =>
  api<{ url: string }>("/connect/onboard", { method: "POST" });
// Opens the professional's Stripe dashboard (balance, payouts, withdrawals).
export const openConnectDashboard = () =>
  api<{ url: string }>("/connect/dashboard", { method: "POST" });
