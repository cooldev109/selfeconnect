import { Star, BadgeCheck } from "lucide-react";
import type { ReviewItem, RatingBreakdown } from "@/lib/reviews";

export function StarRow({
  value,
  className = "h-4 w-4",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${
            i <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </span>
  );
}

// Headline score + a 5→1 star distribution, matching the design concept.
export function RatingSummary({
  avgRating,
  reviewCount,
  breakdown,
}: {
  avgRating: number;
  reviewCount: number;
  breakdown: RatingBreakdown;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="text-center">
        <div className="font-display text-5xl font-bold leading-none text-foreground">
          {avgRating.toFixed(1)}
        </div>
        <div className="mt-2 flex justify-center">
          <StarRow value={avgRating} className="h-4 w-4" />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {reviewCount} review{reviewCount === 1 ? "" : "s"}
        </div>
      </div>
      <div className="min-w-[180px] flex-1 space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const n = breakdown[String(star) as keyof RatingBreakdown] ?? 0;
          const pct = reviewCount ? (n / reviewCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{star}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-5 text-right tabular-nums text-muted-foreground">
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewCard({ review }: { review: ReviewItem }) {
  const initial = (review.author?.[0] ?? "?").toUpperCase();
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-sm font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">
              {review.author}
            </span>
            {review.hired && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> Hired on SelfeConnect
              </span>
            )}
            {!review.hired && review.verified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary/80">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified customer
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <StarRow value={review.rating} className="h-3.5 w-3.5" />
            <span className="text-xs text-muted-foreground">
              {new Date(review.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          {review.comment && (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
