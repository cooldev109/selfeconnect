import { api } from "./api";

// Mirrors the backend badge set (backend/src/verification/badges.ts).
export interface VerificationBadges {
  email: boolean;
  phone: boolean;
  identity: boolean;
  insurance: boolean;
  insuranceExpiresAt: string | null;
  qualification: boolean;
  qualificationLabel: string | null;
  /** The headline "Verified Pro" signal — identity confirmed by an admin. */
  verifiedPro: boolean;
}

export type DocType = "identity" | "insurance" | "qualification";
export type DocStatus = "none" | "pending" | "verified" | "rejected";

export interface DocState {
  status: DocStatus;
  label?: string | null;
  reference?: string | null;
  expiresAt?: string | null;
  hasDocument?: boolean;
  reviewerNotes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface VerificationState {
  email: { verified: boolean; address: string };
  phone: { verified: boolean; number: string | null };
  identity: DocState;
  insurance: DocState;
  qualification: DocState;
  badges: VerificationBadges;
}

export const getVerification = () => api<VerificationState>("/me/verification");

export const resendVerificationEmail = () =>
  api<{ ok: boolean; alreadyVerified?: boolean }>("/me/verification/email/resend", {
    method: "POST",
  });

export const startPhoneVerify = (phone?: string) =>
  api<{ ok: boolean; mock: boolean; devCode?: string }>(
    "/me/verification/phone/start",
    { method: "POST", body: JSON.stringify({ phone }) },
  );

export const confirmPhoneVerify = (code: string) =>
  api<{ ok: boolean; verified: boolean }>("/me/verification/phone/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

export const submitVerificationDoc = (
  type: DocType,
  file: File,
  fields: { label?: string; reference?: string; expiresAt?: string } = {},
) => {
  const body = new FormData();
  body.append("file", file);
  if (fields.label) body.append("label", fields.label);
  if (fields.reference) body.append("reference", fields.reference);
  if (fields.expiresAt) body.append("expiresAt", fields.expiresAt);
  return api<{ id: string; type: string; status: DocStatus }>(
    `/me/verification/${type}/document`,
    { method: "POST", body },
  );
};
