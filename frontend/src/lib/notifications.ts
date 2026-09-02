import { api } from "./api";

export interface AppNotification {
  id: string;
  kind: "quote" | "message" | "hired" | "verification" | "dispute" | "job";
  title: string;
  body: string | null;
  jobId: string | null;
  read: boolean;
  createdAt: string;
}

// Professional bell.
export const proNotifications = () => api<AppNotification[]>("/notifications");
export const proReadNotifications = () =>
  api<{ ok: true }>("/notifications/read", { method: "POST" });

// Customer bell.
export const customerNotifications = () => api<AppNotification[]>("/customer/notifications");
export const customerReadNotifications = () =>
  api<{ ok: true }>("/customer/notifications/read", { method: "POST" });
