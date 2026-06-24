import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Tip {
  id: string;
  date: string; // ISO
  amount: number;
  rating: number; // 1-5
  customerName?: string;
  message?: string;
  area?: string;
}

export interface DayBucket {
  day: string;
  total: number;
}

export interface TipsSummary {
  tips: Tip[];
  total: number;
  average: number;
  avgRating: number;
  perDay: DayBucket[];
  bestDay: DayBucket;
  fiveStarStreak: number;
}

// Safe defaults so the dashboard renders (flat chart, zeroed stats) while the
// summary loads, keeping the existing synchronous destructuring contract.
const EMPTY: TipsSummary = {
  tips: [],
  total: 0,
  average: 0,
  avgRating: 0,
  perDay: Array.from({ length: 14 }, () => ({ day: "", total: 0 })),
  bestDay: { day: "", total: 0 },
  fiveStarStreak: 0,
};

// Real dashboard data for the signed-in driver (GET /me/tips). Amounts arrive
// in pounds already, matching the Tip interface the UI expects.
export function useTips(): TipsSummary {
  const { data } = useQuery({
    queryKey: ["tips-summary"],
    queryFn: () => api<TipsSummary>("/me/tips"),
    retry: false,
  });
  return data ?? EMPTY;
}
