import { Injectable } from '@nestjs/common';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

@Injectable()
export class GeoService {
  // Normalize a UK postcode and geocode it via the free postcodes.io service.
  // Returns null for empty/invalid postcodes so callers can decide how to react.
  async geocode(
    postcode: string,
  ): Promise<(GeoPoint & { district?: string }) | null> {
    const pc = (postcode || '').toUpperCase().replace(/\s+/g, '');
    if (!pc) return null;
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result?: {
          latitude?: number;
          longitude?: number;
          admin_district?: string;
        };
      };
      const r = data?.result;
      if (
        !r ||
        typeof r.latitude !== 'number' ||
        typeof r.longitude !== 'number'
      ) {
        return null;
      }
      return {
        latitude: r.latitude,
        longitude: r.longitude,
        district: r.admin_district,
      };
    } catch {
      return null;
    }
  }

  // Great-circle (haversine) distance in miles between two points.
  distanceMiles(a: GeoPoint, b: GeoPoint): number {
    const R = 3958.7613; // Earth radius in miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
}
