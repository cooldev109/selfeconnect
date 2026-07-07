import { api } from "./api";

// A review as shown on a professional's profile / their "My reviews" page.
export interface ReviewItem {
  rating: number;
  comment: string | null;
  author: string;
  date: string;
  verified: boolean; // left by a registered SelfeConnect customer
  hired: boolean; // linked to a job they hired for on the platform
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

// The signed-in professional's own received reviews + rating breakdown.
export const getMyReviews = () => api<MyReviews>("/me/reviews");
