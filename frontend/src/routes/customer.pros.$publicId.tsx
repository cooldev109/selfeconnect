import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Star, Mail, Phone, MapPin, Heart } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { StarRow, RatingSummary, ReviewCard } from "@/components/Reviews";
import { getProProfile } from "@/lib/pros";
import { createReview } from "@/lib/reviews";

export const Route = createFileRoute("/customer/pros/$publicId")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { review?: string; jobId?: string } => ({
    review: typeof s.review === "string" ? s.review : undefined,
    jobId: typeof s.jobId === "string" ? s.jobId : undefined,
  }),
  head: () => ({ meta: [{ title: "Professional profile — SelfeConnect" }] }),
  component: ProProfilePage,
});

function ProProfilePage() {
  const { publicId } = useParams({ from: "/customer/pros/$publicId" });
  const search = Route.useSearch();
  const q = useQuery({
    queryKey: ["pro-profile", publicId],
    queryFn: () => getProProfile(publicId),
    retry: false,
  });

  const [reviewing, setReviewing] = useState(search.review === "1");

  if (q.isLoading) {
    return (
      <CustomerShell>
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CustomerShell>
    );
  }

  const p = q.data;

  return (
    <CustomerShell>
      <Link
        to="/customer/search"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      {!p ? (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            This professional could not be found.
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Profile hero — the deep ink band gives a hired professional the
              presence a plain card can't. */}
          <div className="overflow-hidden rounded-3xl shadow-elevated">
            <div className="relative bg-ink p-7">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <img
                  src={
                    p.photoUrl ||
                    "https://api.dicebear.com/7.x/initials/svg?seed=" +
                      encodeURIComponent(p.name)
                  }
                  alt={p.name}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-white/15"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-3xl font-bold text-ink-foreground">
                    {p.name}
                  </h1>
                  {p.company && (
                    <p className="mt-0.5 text-sm text-ink-muted">{p.company}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StarRow value={p.avgRating} className="h-4 w-4" />
                    <span className="text-sm font-semibold text-ink-foreground tabular-nums">
                      {p.avgRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-ink-muted">
                      · {p.reviewCount} review{p.reviewCount === 1 ? "" : "s"}
                    </span>
                    {(p.city || p.postcode) && (
                      <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                        <MapPin className="h-3.5 w-3.5" /> {p.city || p.postcode}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-ink-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setReviewing((r) => !r)}
                >
                  <Star className="mr-2 h-4 w-4" /> Write a review
                </Button>
              </div>
            </div>

            {/* Bio + how to reach them */}
            <div className="bg-card p-6">
              {p.bio && (
                <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
                  {p.bio}
                </p>
              )}
              <div
                className={`flex flex-wrap gap-3 ${p.bio ? "mt-5 border-t border-border pt-5" : ""}`}
              >
                {p.contact.phone && (
                  <a
                    href={`tel:${p.contact.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Phone className="h-4 w-4" /> {p.contact.phone}
                  </a>
                )}
                <a
                  href={`mailto:${p.contact.email}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <Mail className="h-4 w-4" /> {p.contact.email}
                </a>
              </div>
            </div>
          </div>

          {reviewing && (
            <ReviewForm
              publicId={publicId}
              jobId={search.jobId}
              onDone={() => setReviewing(false)}
            />
          )}

          {/* Reviews */}
          {p.reviewCount > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <RatingSummary
                  avgRating={p.avgRating}
                  reviewCount={p.reviewCount}
                  breakdown={p.breakdown}
                />
              </CardContent>
            </Card>
          )}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Reviews</h2>
            {p.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviews yet — be the first to leave one.
              </p>
            ) : (
              <div className="space-y-3">
                {p.reviews.map((r, i) => (
                  <ReviewCard key={i} review={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </CustomerShell>
  );
}

function ReviewForm({
  publicId,
  jobId,
  onDone,
}: {
  publicId: string;
  jobId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      createReview({
        driverPublicId: publicId,
        jobId,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["pro-profile", publicId] });
    },
  });

  if (done) {
    return (
      <Card className="rounded-2xl border-primary/30 bg-[#E1F5EE]/40">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
          <p className="text-sm font-semibold text-foreground">
            Thanks for your review!
          </p>
          <p className="text-xs text-muted-foreground">
            It's now live on this professional's profile.
          </p>
          <Button
            variant="outline"
            className="mt-2 rounded-xl"
            onClick={onDone}
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-primary/30">
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-foreground">Leave a review</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How was the service?
        </p>

        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-8 w-8 transition ${
                  i <= (hover || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Tell others about your experience (optional)…"
          className="mt-4 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <Heart className="h-3.5 w-3.5 text-primary" />
          Reviews are free — tipping is entirely optional and separate.
          <Link
            to="/tip/$driverId"
            params={{ driverId: publicId }}
            className="ml-auto font-semibold text-primary hover:underline"
          >
            Say thanks with a tip →
          </Link>
        </div>

        {submit.isError && (
          <p className="mt-3 text-sm text-destructive">
            Couldn't post your review. Please try again.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onDone}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…
              </>
            ) : (
              "Post review"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
