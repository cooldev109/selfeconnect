import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PostJobWizard } from "@/components/PostJobWizard";
import { createJob } from "@/lib/jobs";
import { customerLogin, customerMe, customerSignup } from "@/lib/customer-auth";
import { ApiError } from "@/lib/api";

/**
 * The post-a-job wizard plus the signup/login-then-post logic, in one reusable
 * unit. A logged-out visitor creates their account (or logs in) at the final
 * step before the job posts — no "sign up first" wall. Used on the /post-a-job
 * page and embedded directly in the homepage hero.
 */
export function PostJobFlow({
  initialCategorySlug,
  initialPostcode,
}: {
  initialCategorySlug?: string;
  initialPostcode?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // A 401 here is the normal logged-out case, not an error — don't redirect.
  const meQ = useQuery({ queryKey: ["customer-me"], queryFn: customerMe, retry: false });
  const authed = !!meQ.data?.customer;

  if (meQ.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PostJobWizard
      requireAccount={!authed}
      initialCategorySlug={initialCategorySlug}
      initialPostcode={initialPostcode}
      onSubmit={async (input, account) => {
        // Logged-out: create the account (or log in) before posting.
        if (account) {
          try {
            const res = await customerSignup({
              name: account.name,
              email: account.email,
              password: account.password,
            });
            qc.setQueryData(["customer-me"], res);
          } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
              // Email already registered — treat the password they typed as a
              // login attempt so returning customers sail through.
              try {
                const res = await customerLogin({
                  email: account.email,
                  password: account.password,
                });
                qc.setQueryData(["customer-me"], res);
              } catch {
                throw new Error(
                  "That email already has an account, but the password doesn't match. Log in with your password, or use a different email.",
                );
              }
            } else {
              throw err;
            }
          }
        }
        await createJob(input);
        await qc.invalidateQueries({ queryKey: ["my-jobs"] });
        navigate({ to: "/customer" });
      }}
    />
  );
}
