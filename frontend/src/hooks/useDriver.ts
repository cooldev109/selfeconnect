import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Shape consumed across the UI (unchanged from the original mock interface).
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
