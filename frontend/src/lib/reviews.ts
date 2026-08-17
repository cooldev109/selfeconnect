import { api } from "./api";

// A review as shown on a professional's profile / their "My reviews" page.
export interface ReviewItem {
  /** Review id — present for standalone reviews (reportable), null for rated tips. */
  id?: string | null;
  rating: number;
  comment: string | null;
  author: string;
  date: string;
  verified: boolean; // left by a registered SelfeConnect customer
  hired: boolean; // linked to a job they hired for on the platform
  verifiedJob?: boolean; // linked job was completed on-platform — a "Verified Job Review"
  paidOnPlatform?: boolean; // the linked job was paid through the platform
}

export type RatingBreakdown = Record<"1" | "2" | "3" | "4" | "5", number>;

export interface MyReviews {
  avgRating: number;
  reviewCount: number;
  breakdown: RatingBreakdown;
  reviews: ReviewItem[];
}

// Customer posts (or updates) a rating + review for a professional. No payment.
export const createReview = (input: {
  driverPublicId: string;
  jobId?: string;
  rating: number;
  comment?: string;
}) =>
  api<{ ok: true; id: string }>("/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  });

// A review left by scanning the QR code: no account, no payment, no Stripe
// setup on the professional's side. This is what the flyer actually promises.
export const createAnonymousReview = (
  publicId: string,
  input: { rating: number; comment?: string; authorName?: string },
) =>
  api<{ ok: true; id: string }>(`/drivers/${publicId}/reviews`, {
    method: "POST",
    body: JSON.stringify(input),
  });

// The signed-in professional's own received reviews + rating breakdown.
export const getMyReviews = () => api<MyReviews>("/me/reviews");

// A professional flags a review on their profile as fake/abusive.
export const reportMyReview = (id: string, reason: string) =>
  api<{ ok: true; alreadyReported?: boolean }>(`/me/reviews/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
