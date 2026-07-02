import { api } from "./api";

export interface ProSearchResult {
  publicId: string;
  name: string;
  company: string | null;
  photoUrl: string | null;
  categories: string[];
  avgRating: number;
  reviewCount: number;
  distanceMiles: number | null;
}

export interface ProReview {
  rating: number | null;
  message: string | null;
  customerName: string | null;
  date: string;
}

export interface ProProfile {
  publicId: string;
  name: string;
  company: string | null;
  photoUrl: string | null;
  bio: string | null;
  city: string | null;
  postcode: string | null;
  categories: string[];
  avgRating: number;
  reviewCount: number;
  contact: { phone: string | null; email: string };
  reviews: ProReview[];
}

export const browsePros = (opts: {
  category?: string;
  postcode?: string;
  radius?: number;
}) => {
  const p = new URLSearchParams();
  if (opts.category) p.set("category", opts.category);
  if (opts.postcode) p.set("postcode", opts.postcode);
  if (opts.radius) p.set("radius", String(opts.radius));
  const qs = p.toString();
  return api<ProSearchResult[]>(`/pros${qs ? `?${qs}` : ""}`);
};

export const getProProfile = (publicId: string) =>
  api<ProProfile>(`/pros/${publicId}`);
