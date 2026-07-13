import { api } from "./api";

// Type-ahead over real UK postcodes. Because a user can only pick a suggestion,
// "Enter a valid UK postcode" stops being a thing that can happen to them.
export const suggestPostcodes = (q: string) =>
  api<{ postcodes: string[] }>(`/geo/postcodes?q=${encodeURIComponent(q)}`);

// Device coordinates → the nearest real postcode.
export const postcodeFromCoords = (lat: number, lng: number) =>
  api<{ postcode: string | null; latitude?: number; longitude?: number }>(
    `/geo/reverse?lat=${lat}&lng=${lng}`,
  );
