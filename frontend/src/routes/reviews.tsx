import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Star, MessageSquare, BadgeCheck, Sparkles, QrCode } from "lucide-react";
import { Button, Modal } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { StatCard, DashCard, EmptyRow } from "@/components/DashKit";
import { RatingSummary, ReviewCard } from "@/components/Reviews";
import { getMyReviews, reportMyReview, type ReviewItem } from "@/lib/reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "My reviews — SelfeConnect" },
      { name: "description", content: "Ratings and reviews from your customers." },
    ],
  }),
  component: MyReviewsPage,
});

// A review counts as "verified" when it's tied to a real customer/job on the
// platform (not an anonymous QR scan) — the same signal ReviewCard badges.
const isVerified = (r: ReviewItem) =>
  !!(r.verified || r.hired || r.verifiedJob || r.paidOnPlatform);

type Filter = "all" | "5" | "4up" | "verified" | "comments";

function MyReviewsPage() {
  const q = useQuery({
    queryKey: ["my-reviews"],
    queryFn: getMyReviews,
    retry: false,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [toReport, setToReport] = useState<ReviewItem | null>(null);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);
  const report = useMutation({
    mutationFn: () => reportMyReview(toReport!.id!, reason),
    onSuccess: () => setReported(true),
  });
  const closeReport = () => {
    setToReport(null);
    setReason("");
    setReported(false);
    report.reset();
  };

  const reviews = q.data?.reviews ?? [];
  const verifiedCount = useMemo(() => reviews.filter(isVerified).length, [reviews]);
  const commentCount = useMemo(
    () => reviews.filter((r) => r.comment?.trim()).length,
    [reviews],
  );
  const fiveStar = q.data?.breakdown?.["5"] ?? 0;
  const fiveStarPct = q.data?.reviewCount ? Math.round((fiveStar / q.data.reviewCount) * 100) : 0;

  const filtered = useMemo(() => {
    switch (filter) {
      case "5":
        return reviews.filter((r) => r.rating === 5);
      case "4up":
        return reviews.filter((r) => r.rating >= 4);
      case "verified":
        return reviews.filter(isVerified);
      case "comments":
        return reviews.filter((r) => r.comment?.trim());
      default:
        return reviews;
    }
  }, [reviews, filter]);

  const FILTERS: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "All", n: reviews.length },
    { key: "5", label: "5 stars", n: fiveStar },
    { key: "4up", label: "4★ & up", n: reviews.filter((r) => r.rating >= 4).length },
    { key: "verified", label: "Verified", n: verifiedCount },
    { key: "comments", label: "With comments", n: commentCount },
  ];

  return (
    <ProShell
      title="My reviews"
      subtitle="What your customers say — ratings and written reviews."
    >
      {q.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !q.data || q.data.reviewCount === 0 ? (
        <DashCard>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Star className="h-6 w-6" />
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">No reviews yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              As customers rate your work, their reviews appear here and on your
              public profile. Share your QR code to start collecting them.
            </p>
            <Button asChild className="mt-3 rounded-xl">
              <Link to="/profile">Get your QR code</Link>
            </Button>
          </div>
        </DashCard>
      ) : (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              icon={Star}
              label="Average rating"
              value={q.data.avgRating.toFixed(1)}
              tone="bg-amber-100 text-amber-600"
              foot={`out of 5`}
            />
            <StatCard
              icon={MessageSquare}
              label="Total reviews"
              value={q.data.reviewCount}
              foot={`${commentCount} with a comment`}
            />
            <StatCard
              icon={Sparkles}
              label="5-star reviews"
              value={`${fiveStarPct}%`}
              tone="bg-violet-100 text-violet-600"
              foot={`${fiveStar} of ${q.data.reviewCount}`}
            />
            <StatCard
              icon={BadgeCheck}
              label="Verified"
              value={verifiedCount}
              tone="bg-sky-100 text-sky-600"
              foot="from real customers"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Review list + filters */}
            <DashCard
              title="Reviews"
              action={
                <span className="text-xs text-muted-foreground">
                  {filtered.length} shown
                </span>
              }
            >
              <div className="mb-4 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      filter === f.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1 tabular-nums opacity-70">{f.n}</span>
                  </button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <EmptyRow>No reviews match this filter.</EmptyRow>
              ) : (
                <div className="space-y-3">
                  {filtered.map((r, i) => (
                    <ReviewCard key={r.id ?? i} review={r} onReport={setToReport} />
                  ))}
                </div>
              )}
            </DashCard>

            {/* Breakdown + get-more-reviews */}
            <aside className="space-y-4">
              <DashCard title="Rating breakdown">
                <RatingSummary
                  avgRating={q.data.avgRating}
                  reviewCount={q.data.reviewCount}
                  breakdown={q.data.breakdown}
                  verifiedCount={verifiedCount}
                />
              </DashCard>
              <DashCard title="Get more reviews">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <QrCode className="h-5 w-5" />
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Share your QR code after every job — customers can rate you in
                    seconds, no account needed.
                  </p>
                </div>
                <Button asChild variant="outline" className="mt-4 w-full justify-center rounded-xl">
                  <Link to="/profile">Open my QR code</Link>
                </Button>
              </DashCard>
            </aside>
          </div>
        </div>
      )}

      <Modal
        open={!!toReport}
        onOpenChange={(o) => { if (!o) closeReport(); }}
        title={reported ? "Report received" : "Report this review"}
      >
        {reported ? (
          <>
            <p className="text-sm text-muted-foreground">
              Thanks — our team will take a look. Reviews that break our rules are removed.
            </p>
            <div className="mt-5 flex justify-end">
              <Button className="rounded-xl" onClick={closeReport}>Done</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Tell us why this {toReport?.rating}★ review from{" "}
              <strong>{toReport?.author}</strong> should be looked at — e.g. it's fake, from a
              competitor, or abusive.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="What's wrong with this review?"
              className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={closeReport}>
                Cancel
              </Button>
              <Button
                className="rounded-xl"
                disabled={reason.trim().length < 3 || report.isPending}
                onClick={() => report.mutate()}
              >
                {report.isPending ? "Sending…" : "Report review"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </ProShell>
  );
}
