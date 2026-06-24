import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { me, type AuthDriver } from "./auth";

// Client-side guard for protected pages: checks the session and redirects to
// /login when unauthenticated. Returns the auth query so pages can gate render.
export function useRequireAuth() {
  const navigate = useNavigate();
  const query = useQuery<{ driver: AuthDriver }>({
    queryKey: ["auth-me"],
    queryFn: me,
    retry: false,
  });

  useEffect(() => {
    if (query.isError) navigate({ to: "/login" });
  }, [query.isError, navigate]);

  return query;
}
