import { api } from "./api";

export interface AdminDispute {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  raisedByKind: "professional" | "customer";
  raisedBy: string;
  customerName: string;
  proName: string | null;
  reason: string;
  detail: string;
  status: "open" | "resolved" | "rejected";
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminAbuseReport {
  id: string;
  targetType: "driver" | "customer" | "job";
  targetId: string;
  reporterKind: "professional" | "customer";
  reason: string;
  status: "open" | "actioned" | "dismissed";
  createdAt: string;
}

// ---- Admin ----
export const getAdminDisputes = () => api<AdminDispute[]>("/admin/disputes");
export const resolveDispute = (id: string, status: "resolved" | "rejected", notes?: string) =>
  api(`/admin/disputes/${id}/resolve`, { method: "POST", body: JSON.stringify({ status, notes }) });
export const getAdminReports = () => api<AdminAbuseReport[]>("/admin/reports");
export const resolveReport = (id: string, status: "actioned" | "dismissed") =>
  api(`/admin/reports/${id}/resolve`, { method: "POST", body: JSON.stringify({ status }) });

// ---- Raising (customer + professional) ----
export const raiseJobDispute = (jobId: string, body: { reason: string; detail: string }) =>
  api<{ ok: true; id: string }>(`/jobs/${jobId}/dispute`, { method: "POST", body: JSON.stringify(body) });
export const raiseProJobDispute = (jobId: string, body: { reason: string; detail: string }) =>
  api<{ ok: true; id: string }>(`/pro/jobs/${jobId}/dispute`, { method: "POST", body: JSON.stringify(body) });

export const reportAsCustomer = (body: { targetType: "driver" | "customer" | "job"; targetId: string; reason: string }) =>
  api<{ ok: true; id: string }>(`/report`, { method: "POST", body: JSON.stringify(body) });
export const reportAsPro = (body: { targetType: "driver" | "customer" | "job"; targetId: string; reason: string }) =>
  api<{ ok: true; id: string }>(`/pro/report`, { method: "POST", body: JSON.stringify(body) });

// Reusable list of dispute reasons for the raise form.
export const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: "work_not_completed", label: "Work wasn't completed" },
  { value: "quality", label: "Quality of work" },
  { value: "no_show", label: "No-show / didn't turn up" },
  { value: "payment", label: "Payment problem" },
  { value: "behaviour", label: "Behaviour / conduct" },
  { value: "other", label: "Something else" },
];
