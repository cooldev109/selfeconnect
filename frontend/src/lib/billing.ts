import { api } from "./api";

export interface AccountInfo {
  email: string;
  phone: string;
  subscriptionStatus: string;
  isActive: boolean;
  stripeOnboarded: boolean;
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
