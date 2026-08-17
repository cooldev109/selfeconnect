import { api } from "./api";

export interface Analytics {
  users: {
    totalPros: number;
    totalCustomers: number;
    newPros30: number;
    newCustomers30: number;
    activePros: number;
    onboardedPros: number;
  };
  jobs: {
    totalJobs: number;
    openJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    noQuoteJobs: number;
    totalQuotes: number;
    quotesPerJob: number;
  };
  conversions: {
    signupToActivePct: number;
    jobToHiredPct: number;
    jobToCompletedPct: number;
    noQuotePct: number;
  };
  revenue: {
    mrr: number;
    activePros: number;
    cancellingSubs: number;
    canceledSubs: number;
    churnPct: number;
  };
  responseTime: { medianHours: number; quotedJobs: number };
  signupTrend: { week: string; pros: number; customers: number }[];
}

export interface HistoryEvent {
  at: string;
  kind: string;
  title: string;
  detail?: string;
}

export interface UserHistory {
  user: {
    name: string;
    email: string;
    role: "professional" | "customer";
    joinedAt: string;
    [k: string]: unknown;
  };
  stats: Record<string, number>;
  timeline: HistoryEvent[];
}

export const getAnalytics = () => api<Analytics>("/admin/analytics");
export const getDriverHistory = (id: string) => api<UserHistory>(`/admin/drivers/${id}/history`);
export const getCustomerHistory = (id: string) => api<UserHistory>(`/admin/customers/${id}/history`);
