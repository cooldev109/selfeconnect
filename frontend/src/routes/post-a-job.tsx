import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogoMark } from "@/components/Logo";
import { PostJobFlow } from "@/components/PostJobFlow";
import { customerMe } from "@/lib/customer-auth";

export const Route = createFileRoute("/post-a-job")({
  // The homepage hero can start the flow with the service + postcode already
  // chosen; carry them in so the wizard opens pre-filled.
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : undefined,
    postcode: typeof search.postcode === "string" ? search.postcode : undefined,
  }),
  head: () => ({ meta: [{ title: "Post a job — SelfeConnect" }] }),
  component: PostAJobPage,
});

// Public, job-first entry point. Anyone can walk the wizard; a logged-out
// visitor creates their account inline at the final step (or logs in), and the
// job posts immediately — no "sign up first" wall before they've committed.
function PostAJobPage() {
  const { category, postcode } = Route.useSearch();
  const meQ = useQuery({ queryKey: ["customer-me"], queryFn: customerMe, retry: false });
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
            <Link to="/customer/login" className="text-sm font-semibold text-primary hover:underline">
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
          <PostJobFlow initialCategorySlug={category} initialPostcode={postcode} />
        </div>
      </div>
    </main>
  );
}
