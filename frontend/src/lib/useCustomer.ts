import { useQuery } from "@tanstack/react-query";
import { customerMe } from "./customer-auth";

// Reads the customer session without forcing anyone to have one. Public pages
// (professional search + profiles) use this to show *more* to a signed-in
// customer rather than to keep everyone else out.
export function useCustomer() {
  const q = useQuery({
    queryKey: ["customer-me"],
    queryFn: customerMe,
    retry: false,
    staleTime: 60_000,
  });
  return { customer: q.data?.customer, loading: q.isLoading };
}
