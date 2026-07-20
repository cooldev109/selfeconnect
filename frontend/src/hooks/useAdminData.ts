import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AdminDriver {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  status: "active" | "inactive";
  totalTips: number;
  avgRating: number;
  joinDate: string;
  phone: string;
  company: string;
}

export interface AdminTransaction {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  type: "tip" | "payment";
  customerName?: string;
  rating: number;
  status: "succeeded" | "refunded" | "pending" | "failed";
  timestamp: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "person" | "business";
  companyName: string;
  postcode: string;
  jobsPosted: number;
  reviewsLeft: number;
  joinDate: string;
}

export interface AdminSubscription {
  id: string;
  name: string;
  email: string;
  status: string;
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  stripeOnboarded: boolean;
  hasStripeSubscription: boolean;
  joinDate: string;
}

export interface AdminJob {
  id: string;
  title: string;
  description: string;
  category: string;
  customerName: string;
  customerEmail: string;
  postcode: string;
  status: "open" | "closed";
  maxContacts: number | null;
  contactCount: number;
  hiredDriverName: string | null;
  budget: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  driverId: string;
  driverName: string;
  author: string;
  verified: boolean;
  hired: boolean;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MonthBucket {
  month: string;
  volume: number;
}

interface Overview {
  totalDrivers: number;
  activeSubs: number;
  cancellingSubs: number;
  onboardedDrivers: number;
  totalCustomers: number;
  openJobs: number;
  totalJobs: number;
  totalReviews: number;
  totalTipsProcessed: number;
  tipCount: number;
  totalPaymentsProcessed: number;
  paymentCount: number;
  platformRevenue: number;
  monthly: MonthBucket[];
}

// Real platform data for the admin console. Filtering, pagination and CSV export
// stay client-side in the route components, so the lists are returned in full —
// matching the shape the screens already consume.
export function useAdminData() {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api<Overview>("/admin/overview"),
    retry: false,
  });
  const driversQ = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => api<AdminDriver[]>("/admin/drivers"),
    retry: false,
  });
  const transactionsQ = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => api<AdminTransaction[]>("/admin/transactions"),
    retry: false,
  });
  const customersQ = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => api<AdminCustomer[]>("/admin/customers"),
    retry: false,
  });
  const subscriptionsQ = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => api<AdminSubscription[]>("/admin/subscriptions"),
    retry: false,
  });
  const jobsQ = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: () => api<AdminJob[]>("/admin/jobs"),
    retry: false,
  });
  const reviewsQ = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => api<AdminReview[]>("/admin/reviews"),
    retry: false,
  });
  const o = overview.data;

  return {
    drivers: driversQ.data ?? [],
    transactions: transactionsQ.data ?? [],
    customers: customersQ.data ?? [],
    subscriptions: subscriptionsQ.data ?? [],
    jobs: jobsQ.data ?? [],
    reviews: reviewsQ.data ?? [],
    monthly: o?.monthly ?? [],
    totalDrivers: o?.totalDrivers ?? 0,
    activeSubs: o?.activeSubs ?? 0,
    cancellingSubs: o?.cancellingSubs ?? 0,
    onboardedDrivers: o?.onboardedDrivers ?? 0,
    totalCustomers: o?.totalCustomers ?? 0,
    openJobs: o?.openJobs ?? 0,
    totalJobs: o?.totalJobs ?? 0,
    totalReviews: o?.totalReviews ?? 0,
    totalTipsProcessed: o?.totalTipsProcessed ?? 0,
    tipCount: o?.tipCount ?? 0,
    totalPaymentsProcessed: o?.totalPaymentsProcessed ?? 0,
    paymentCount: o?.paymentCount ?? 0,
    platformRevenue: o?.platformRevenue ?? 0,
    error: overview.error ?? driversQ.error ?? transactionsQ.error,
  };
}
