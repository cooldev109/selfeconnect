import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { PostJobWizard } from "@/components/PostJobWizard";
import { createJob } from "@/lib/jobs";
import { customerLogin, customerMe, customerSignup } from "@/lib/customer-auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/post-a-job")({
  head: () => ({ meta: [{ title: "Post a job — SelfeConnect" }] }),
  component: PostAJobPage,
});

// Public, job-first entry point. Anyone can walk the wizard; a logged-out
// visitor creates their account inline at the final step (or logs in), and the
// job posts immediately — no "sign up first" wall before they've committed.
function PostAJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // A 401 here is the normal logged-out case, not an error — don't redirect.
  const meQ = useQuery({
    queryKey: ["customer-me"],
    queryFn: customerMe,
    retry: false,
  });
  const authed = !!meQ.data?.customer;

  return (
    <main className="min-h-screen bg-[#F4F8F8]">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="text-lg font-extrabold tracking-tight text-foreground font-display">
              Selfe<span className="text-primary">Connect</span>
            </span>
          </Link>
          {!authed && (
            <Link
              to="/customer/login"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Log in
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display">
          Post a job
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Tell us what you need — local professionals in that trade can quote. It's free.
        </p>

        <div className="mt-8 rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          {meQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <PostJobWizard
              requireAccount={!authed}
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
                      // Email already registered — treat the password they
                      // typed as a login attempt so returning customers sail
                      // through instead of hitting a dead end.
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
          )}
        </div>
      </div>
    </main>
  );
}
