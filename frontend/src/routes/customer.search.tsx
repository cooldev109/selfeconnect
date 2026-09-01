import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/shared";
import { BrowseShell } from "@/components/BrowseShell";
import { DashCard } from "@/components/DashKit";
import { CategorySelect } from "@/components/CategoryPicker";
import { PostcodeInput } from "@/components/PostcodeInput";
import { StarRow } from "@/components/Reviews";
import { VerificationBadges } from "@/components/VerificationBadges";
import { browsePros } from "@/lib/pros";
import { useCustomer } from "@/lib/useCustomer";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/customer/search")({
  // A search started from the homepage hero arrives here as URL params, so the
  // visitor's intent survives the sign-in step.
  validateSearch: (
    s: Record<string, unknown>,
  ): { category?: string; postcode?: string } => ({
    category: typeof s.category === "string" ? s.category : undefined,
    postcode: typeof s.postcode === "string" ? s.postcode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find a professional — SelfeConnect" },
      { name: "description", content: "Search reviewed professionals near you." },
    ],
  }),
  component: SearchPage,
});

const RADII = [5, 10, 25, 50, 100];

function SearchPage() {
  const { customer } = useCustomer();
  const initial = Route.useSearch();
  const [category, setCategory] = useState(initial.category ?? "");
  const [postcode, setPostcode] = useState(initial.postcode ?? "");
  const [radius, setRadius] = useState(25);
  const [applied, setApplied] = useState<{
    category?: string;
    postcode?: string;
    radius?: number;
  }>({
    category: initial.category || undefined,
    postcode: initial.postcode || undefined,
    radius: initial.postcode ? 25 : undefined,
  });

  const prosQ = useQuery({
    queryKey: ["pros", applied],
    queryFn: () => browsePros(applied),
    retry: false,
  });

  // "Within X miles" is measured from the customer's postcode, so a set distance
  // needs one. Without it the distance can't filter anything — so we ask for the
  // postcode rather than silently ignoring the choice.
  const [needsPostcode, setNeedsPostcode] = useState(false);
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (radius > 0 && !postcode.trim()) {
      setNeedsPostcode(true);
      return;
    }
    setNeedsPostcode(false);
    setApplied({
      category: category || undefined,
      postcode: postcode || undefined,
      // radius 0 = "Anywhere": send no radius so every professional shows,
      // still ordered nearest-first when a postcode is given.
      radius: postcode && radius > 0 ? radius : undefined,
    });
  };

  const badPostcode = prosQ.error instanceof ApiError && prosQ.error.status === 400;
  const pros = prosQ.data ?? [];

  return (
    <BrowseShell
      title="Find a professional"
      subtitle="Search reviewed professionals by service and location. Free — no account needed to look."
    >
      {/* A plain card (not DashCard) so the Service/Postcode dropdowns can
          overflow the container instead of being clipped; z-20 keeps them above
          the results grid below. */}
      <div className="relative z-20 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <form
          onSubmit={apply}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
        >
          <div className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Service
            </span>
            <CategorySelect value={category} onChange={setCategory} allLabel="All services" />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Your postcode
            </span>
            <PostcodeInput
              value={postcode}
              onChange={(pc) => { setPostcode(pc); if (pc.trim()) setNeedsPostcode(false); }}
              ariaLabel="Your postcode"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Within</span>
            <select
              value={radius}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRadius(r);
                if (r === 0) setNeedsPostcode(false);
              }}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} mi
                </option>
              ))}
              <option value={0}>Anywhere</option>
            </select>
          </label>
          <Button
            type="submit"
            className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <SearchIcon className="mr-2 h-4 w-4" /> Search
          </Button>
        </form>
        {needsPostcode ? (
          <p className="mt-2 text-xs text-destructive">
            Enter your postcode to search within a set distance — or choose “Anywhere” to see
            every professional.
          </p>
        ) : badPostcode ? (
          <p className="mt-2 text-xs text-destructive">Enter a valid UK postcode.</p>
        ) : (
          <p id="postcode-help" className="mt-2 text-xs text-muted-foreground">
            Enter where <em>you</em> are — we'll show professionals near you, nearest first.
            Pick “Anywhere” to see everyone.
          </p>
        )}
      </div>

      {prosQ.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : pros.length === 0 && !badPostcode ? (
        <div className="mt-5">
          <DashCard>
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div>
                <p className="text-sm font-semibold text-foreground">No professionals here yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Nobody matches your search in this area yet. Try a different service or a wider
                  radius — or post your job and let professionals come to you.
                </p>
              </div>
              <Button asChild className="rounded-xl">
                <Link to={customer ? "/customer/jobs/new" : "/customer/signup"}>
                  {customer ? "Post a job — let professionals find you" : "Sign up free & post a job"}
                </Link>
              </Button>
            </div>
          </DashCard>
        </div>
      ) : (
        <>
          {pros.length > 0 && (
            <p className="mb-3 mt-5 text-sm text-muted-foreground">
              {pros.length} professional{pros.length === 1 ? "" : "s"}
              {applied.postcode ? " near you" : ""}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {pros.map((p) => (
              <div
                key={p.publicId}
                className="flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={
                      p.photoUrl ||
                      "https://api.dicebear.com/7.x/initials/svg?seed=" +
                        encodeURIComponent(p.name)
                    }
                    alt={p.name}
                    className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
                      {p.distanceMiles != null && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          <MapPin className="mr-1 h-3 w-3" /> {p.distanceMiles} mi
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <StarRow value={p.avgRating} className="h-3.5 w-3.5" />
                      <span>
                        {p.avgRating.toFixed(1)} ({p.reviewCount})
                      </span>
                    </div>
                    <VerificationBadges
                      badges={p.badges}
                      only={["verifiedPro", "insurance", "qualification"]}
                      size="sm"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
                  {p.categories.join(" · ")}
                </p>
                <Link
                  to="/customer/pros/$publicId"
                  params={{ publicId: p.publicId }}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View profile
                </Link>
              </div>
            ))}
          </div>

          {/* Look all you like. The account is only asked for at the point it
              actually buys you something. */}
          {!customer && pros.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-[#E1F5EE] p-6 text-center">
              <p className="text-sm font-semibold text-foreground">Ready to get in touch?</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Create a free account to see their phone number and email, post a job, and leave a
                review. It takes a minute and costs nothing.
              </p>
              <Button asChild className="mt-1 rounded-xl">
                <Link to="/customer/signup">Sign up free</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </BrowseShell>
  );
}
