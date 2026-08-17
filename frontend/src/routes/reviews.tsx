import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { Button, Card, CardContent, Modal } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
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

function MyReviewsPage() {
  const q = useQuery({
    queryKey: ["my-reviews"],
    queryFn: getMyReviews,
    retry: false,
  });

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
              <ReviewCard key={r.id ?? i} review={r} onReport={setToReport} />
            ))}
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
