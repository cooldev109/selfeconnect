import { api } from "./api";

export type JobStatus = "open" | "hired" | "in_progress" | "completed" | "cancelled" | "closed";

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  categorySlug: string;
  categoryName: string;
  postcode: string;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  workingDays: string[];
  workingHours: string | null;
  budget: string | null;
  timing: string | null;
  photos: string[];
  cancelReason: string | null;
  hiredDriverPublicId: string | null;
  hiredDriverName: string | null;
  /** The hired pro accepts payment through the platform. */
  canPayOnPlatform: boolean;
  /** This job has been paid through the platform. */
  paidOnPlatform: boolean;
  /** How many professionals may unlock contact. null = no limit. */
  maxContacts: number | null;
  /** How many have unlocked so far — the "X" in "X of 10". */
  contactCount: number;
  createdAt: string;
}

export interface InterestedPro {
  publicId: string;
  name: string;
  company: string | null;
  categories: string[];
}

export interface JobInput {
  categorySlug: string;
  title: string;
  description: string;
  postcode: string;
  addressLine?: string;
  workingDays?: string[];
  workingHours?: string;
  budget?: string;
  /** Human phrase for when it's needed, e.g. "As soon as possible". */
  timing?: string;
  /** Photo URLs from uploadJobPhoto(), shown to professionals. */
  photos?: string[];
  /** null = no limit on how many professionals may contact them. */
  maxContacts?: number | null;
  /** Required true on create — authorises sharing contact with professionals. */
  contactConsent?: boolean;
}

export const createJob = (b: JobInput) =>
  api<Job>("/jobs", { method: "POST", body: JSON.stringify(b) });

// Upload one job photo (multipart); returns its public URL for the create payload.
export const uploadJobPhoto = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api<{ url: string }>("/jobs/photo", { method: "POST", body: form });
};

export const listMyJobs = () => api<Job[]>("/jobs/mine");

export const getJob = (id: string) => api<Job>(`/jobs/${id}`);

export const updateJob = (
  id: string,
  b: Partial<JobInput> & {
    status?: JobStatus;
    cancelReason?: string;
    hiredDriverPublicId?: string | null;
    maxContacts?: number | null;
  },
) => api<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(b) });

export const deleteJob = (id: string) => api<{ ok: true }>(`/jobs/${id}`, { method: "DELETE" });

// Pay the hired pro for a job through the platform. `amount` is in pence.
// Returns a Stripe client secret (real mode) or mock:true (dev, settles now).
export const payForJob = (id: string, amount: number) =>
  api<{
    tipId: string;
    amount: number;
    clientSecret: string;
    connectedAccountId: string;
    mock: boolean;
  }>(`/jobs/${id}/pay`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const jobInterestedPros = (id: string) => api<InterestedPro[]>(`/jobs/${id}/interested`);

// ---- Professional job board ----
export interface ProJobContact {
  name: string;
  email: string;
  phone: string | null;
  addressLine: string | null;
}
export interface ProJob {
  id: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  postcode: string;
  distanceMiles: number | null;
  workingDays: string[];
  workingHours: string | null;
  budget: string | null;
  /** Lifecycle stage — present on the pipeline ("My jobs") view. */
  status?: JobStatus;
  /** True when this pro is the one the customer marked as hired. */
  hired?: boolean;
  createdAt: string;
  unlocked: boolean;
  /** True when the customer's quote limit is reached and this pro hasn't unlocked. */
  quotesFull: boolean;
  /** This pro's own quote on the job, if they've submitted one. */
  myQuote?: { amount: number | null; message: string } | null;
  contact: ProJobContact | null;
}

// A quote the customer sees on their job — a pro's price + pitch.
export interface JobQuote {
  publicId: string;
  name: string;
  company: string | null;
  categories: string[];
  amount: number | null; // pence
  message: string;
  distanceMiles: number | null;
  createdAt: string;
}

export const proBrowseJobs = (opts: { radius?: number; category?: string }) => {
  const p = new URLSearchParams();
  if (opts.radius) p.set("radius", String(opts.radius));
  if (opts.category) p.set("category", opts.category);
  const qs = p.toString();
  return api<ProJob[]>(`/pro/jobs${qs ? `?${qs}` : ""}`);
};

export const proUnlockJob = (id: string) =>
  api<ProJob>(`/pro/jobs/${id}/unlock`, { method: "POST" });

// Submit (or update) this pro's quote on a job. Also unlocks the contact.
export const proSubmitQuote = (id: string, body: { amount?: number | null; message: string }) =>
  api<ProJob>(`/pro/jobs/${id}/quote`, { method: "POST", body: JSON.stringify(body) });

// The professional's own pipeline — jobs they've unlocked or been hired for.
export const proMyJobs = () => api<ProJob[]>("/pro/jobs/mine");

// Quotes a customer has received on their job.
export const jobQuotes = (id: string) => api<JobQuote[]>(`/jobs/${id}/quotes`);

// ---- In-job chat (customer <-> a pro, per job) ----
export interface ChatMessage {
  id: string;
  fromCustomer: boolean;
  body: string;
  createdAt: string;
}
export interface JobThread {
  publicId: string;
  name: string;
  company: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

// Professional side — a single thread with the customer on a job.
export const proJobMessages = (id: string) => api<ChatMessage[]>(`/pro/jobs/${id}/messages`);
export const proSendJobMessage = (id: string, body: string) =>
  api<ChatMessage>(`/pro/jobs/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) });

// Customer side — the pros they can chat with, and each thread's messages.
export const jobThreads = (id: string) => api<JobThread[]>(`/jobs/${id}/threads`);
export const jobMessages = (id: string, pro: string) =>
  api<ChatMessage[]>(`/jobs/${id}/messages?pro=${encodeURIComponent(pro)}`);
export const sendJobMessage = (id: string, pro: string, body: string) =>
  api<ChatMessage>(`/jobs/${id}/messages`, { method: "POST", body: JSON.stringify({ pro, body }) });

export const WEEK_DAYS: { value: string; label: string }[] = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];
