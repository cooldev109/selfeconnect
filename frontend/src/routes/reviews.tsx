import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { Card, CardContent } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { RatingSummary, ReviewCard } from "@/components/Reviews";
import { getMyReviews } from "@/lib/reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "My reviews — SelfeConnect" },
      { name: "description", content: "Ratings and reviews from your customers." },
    ],
  }),
  component: MyReviewsPage,
});

function MyReviewsPage() {
  const q = useQuery({
    queryKey: ["my-reviews"],
    queryFn: getMyReviews,
    retry: false,
  });

  return (
    <ProShell
      title="My reviews"
      subtitle="What your customers say — ratings and written reviews."
    >
      {q.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !q.data || q.data.reviewCount === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Star className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No reviews yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              As customers rate your work, their reviews will appear here and on
              your public profile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <RatingSummary
                avgRating={q.data.avgRating}
                reviewCount={q.data.reviewCount}
                breakdown={q.data.breakdown}
              />
            </CardContent>
          </Card>
          <div className="space-y-3">
            {q.data.reviews.map((r, i) => (
              <ReviewCard key={i} review={r} />
            ))}
          </div>
        </div>
      )}
    </ProShell>
  );
}
