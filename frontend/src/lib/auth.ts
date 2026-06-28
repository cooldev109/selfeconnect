import { api } from "./api";

export interface AuthDriver {
  id: string;
  publicId: string;
  name: string;
  email: string;
  role: string;
}

export function signup(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
}) {
  return api<{ driver: AuthDriver }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return api<{ driver: AuthDriver }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout() {
  return api<{ ok: true }>("/auth/logout", { method: "POST" });
}

export function me() {
  return api<{ driver: AuthDriver }>("/auth/me");
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return api<{ ok: true }>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
