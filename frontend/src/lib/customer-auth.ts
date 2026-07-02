import { api } from "./api";

// Service-seeker (customer/business) session — separate from the professional
// (driver) auth in lib/auth.ts. Hits the /customer/auth/* endpoints, which set
// their own `sc_customer` cookie server-side.
export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  type: string; // "person" | "business"
  companyName: string | null;
  phone: string | null;
}

export function customerSignup(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  type?: "person" | "business";
  companyName?: string;
}) {
  return api<{ customer: CustomerUser }>("/customer/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function customerLogin(input: { email: string; password: string }) {
  return api<{ customer: CustomerUser }>("/customer/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function customerLogout() {
  return api<{ ok: true }>("/customer/auth/logout", { method: "POST" });
}

export function customerMe() {
  return api<{ customer: CustomerUser }>("/customer/auth/me");
}
