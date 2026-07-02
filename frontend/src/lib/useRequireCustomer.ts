import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { customerMe } from "./customer-auth";
import { ApiError } from "./api";

// Guards a customer-only page: redirects to /customer/login on 401.
export function useRequireCustomer() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["customer-me"],
    queryFn: customerMe,
    retry: false,
  });
  useEffect(() => {
    if (q.isError && q.error instanceof ApiError && q.error.status === 401) {
      navigate({ to: "/customer/login" });
    }
  }, [q.isError, q.error, navigate]);
  return { customer: q.data?.customer, loading: q.isLoading };
}
