import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Pricing = {
  /** What a professional signing up right now would pay, per month. */
  amountGbp: number;
  /** …and whether that is the founding-member rate. */
  founding: boolean;
  /** The rate once the founding spots are gone. */
  standardAmountGbp: number;
  /** How many founding places exist in total. */
  foundingCap: number;
  /** Only sent once it is low enough to be worth showing — otherwise null. */
  spotsLeft: number | null;
};

// Used until the live figure arrives so no page ever flashes a placeholder
// price. Matches the launch rate the backend defaults to.
const FALLBACK: Pricing = {
  amountGbp: 5.49,
  founding: true,
  standardAmountGbp: 9.49,
  foundingCap: 100,
  spotsLeft: null,
};

/**
 * The single price shown across the marketing pages. Reads from the same
 * service that picks the price at checkout, so the two cannot drift.
 */
export function usePricing(): Pricing {
  const { data } = useQuery({
    queryKey: ["pricing"],
    queryFn: () => api<Pricing>("/pricing"),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? FALLBACK;
}

export const gbp = (n: number) => `£${n.toFixed(2)}`;
