import { api } from "./api";
import type { ReviewItem, RatingBreakdown } from "./reviews";
import type { VerificationBadges } from "./verification";
import type { Socials } from "@/hooks/useDriver";

export interface ProSearchResult {
  publicId: string;
  name: string;
  company: string | null;
  photoUrl: string | null;
  categories: string[];
  avgRating: number;
  reviewCount: number;
  distanceMiles: number | null;
  badges: VerificationBadges;
}

export interface ProProfile {
  publicId: string;
  name: string;
  company: string | null;
  photoUrl: string | null;
  bio: string | null;
  city: string | null;
  postcode: string | null;
  galleryPhotos: string[];
  categories: string[];
  avgRating: number;
  reviewCount: number;
  /** How many reviews came from a real SelfeConnect account. */
  verifiedCount: number;
  breakdown: RatingBreakdown;
  /** null for anonymous visitors — an account is required to see it. */
  contact: { phone: string | null; email: string } | null;
  contactLocked: boolean;
  reviews: ReviewItem[];
  badges: VerificationBadges;
  socials: Socials;
}

export const browsePros = (opts: { category?: string; postcode?: string; radius?: number }) => {
  const p = new URLSearchParams();
  if (opts.category) p.set("category", opts.category);
  if (opts.postcode) p.set("postcode", opts.postcode);
  if (opts.radius) p.set("radius", String(opts.radius));
  const qs = p.toString();
  return api<ProSearchResult[]>(`/pros${qs ? `?${qs}` : ""}`);
};

export const getProProfile = (publicId: string) => api<ProProfile>(`/pros/${publicId}`);
