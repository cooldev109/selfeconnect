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
  customerName?: string;
  rating: number;
  status: "succeeded" | "refunded" | "pending" | "failed";
  timestamp: string;
}

export interface MonthBucket {
  month: string;
  volume: number;
}

interface Overview {
  totalDrivers: number;
  activeSubs: number;
  totalTipsProcessed: number;
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

  return {
    drivers: driversQ.data ?? [],
    transactions: transactionsQ.data ?? [],
    monthly: overview.data?.monthly ?? [],
    totalDrivers: overview.data?.totalDrivers ?? 0,
    activeSubs: overview.data?.activeSubs ?? 0,
    totalTipsProcessed: overview.data?.totalTipsProcessed ?? 0,
    platformRevenue: overview.data?.platformRevenue ?? 0,
    error: overview.error ?? driversQ.error ?? transactionsQ.error,
  };
}
