import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Shape consumed across the UI (unchanged from the original mock interface).
export interface Socials {
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
}

export interface Driver {
  id: string;
  name: string;
  firstName: string;
  company: string;
  photoUrl: string;
  vanPhotoUrl: string;
  verified: boolean;
  rating: number;
  ratingsCount: number;
  deliveries: number;
  yearsActive: number;
  city: string;
  tagline: string;
  bio: string;
  postcode: string;
  galleryPhotos: string[];
  socials: Socials;
  categorySlugs: string[];
  categoryNames: string[];
}

// The signed-in driver (GET /me).
export function useMe() {
  return useQuery<Driver>({
    queryKey: ["me"],
    queryFn: () => api<Driver>("/me"),
    retry: false,
  });
}

// A public driver by publicId (GET /drivers/:publicId) — for landing + tip page.
export function useDriverPublic(publicId: string) {
  return useQuery<Driver>({
    queryKey: ["driver", publicId],
    queryFn: () => api<Driver>(`/drivers/${publicId}`),
    retry: false,
    enabled: !!publicId,
  });
}
