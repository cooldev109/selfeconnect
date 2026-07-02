import { api } from "./api";

export interface Job {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  categorySlug: string;
  categoryName: string;
  postcode: string;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  workingDays: string[];
  workingHours: string | null;
  budget: string | null;
  createdAt: string;
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
}

export const createJob = (b: JobInput) =>
  api<Job>("/jobs", { method: "POST", body: JSON.stringify(b) });

export const listMyJobs = () => api<Job[]>("/jobs/mine");

export const getJob = (id: string) => api<Job>(`/jobs/${id}`);

export const updateJob = (
  id: string,
  b: Partial<JobInput> & { status?: "open" | "closed" },
) => api<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(b) });

export const deleteJob = (id: string) =>
  api<{ ok: true }>(`/jobs/${id}`, { method: "DELETE" });

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
  createdAt: string;
  unlocked: boolean;
  contact: ProJobContact | null;
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

export const WEEK_DAYS: { value: string; label: string }[] = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];
