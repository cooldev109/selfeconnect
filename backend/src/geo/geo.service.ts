import { Injectable } from '@nestjs/common';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// The launch service area is a radius around a centre point, not a county. A
// circle matches how the marketplace itself works — customers find pros by
// distance — so a pro admitted here can actually serve customers near the
// centre, and a plumber just over a county line isn't wrongly turned away.
// Tunable via env as the launch area grows (raise the miles, or move the centre;
// expanding to a second hub later means a second centre). Default: 30 miles from
// central Reading (the RG1 outcode centroid).
const SERVICE_AREA = {
  centre: {
    latitude: Number(process.env.SERVICE_AREA_CENTRE_LAT ?? 51.4517),
    longitude: Number(process.env.SERVICE_AREA_CENTRE_LNG ?? -0.9698),
  },
  radiusMiles: Number(process.env.SERVICE_AREA_RADIUS_MILES ?? 30),
};

@Injectable()
export class GeoService {
  // Normalize a UK postcode and geocode it via the free postcodes.io service.
  // Returns null for empty/invalid postcodes so callers can decide how to react.
  async geocode(postcode: string): Promise<GeoPoint | null> {
    const pc = (postcode || '').toUpperCase().replace(/\s+/g, '');
    if (!pc) return null;
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result?: { latitude?: number; longitude?: number };
      };
      const r = data?.result;
      if (
        !r ||
        typeof r.latitude !== 'number' ||
        typeof r.longitude !== 'number'
      ) {
        return null;
      }
      return { latitude: r.latitude, longitude: r.longitude };
    } catch {
      return null;
    }
  }

  // Is this location within the launch radius? Used to gate professional
  // registration to the area we serve.
  isInServiceArea(point: { latitude: number; longitude: number }): boolean {
    return (
      this.distanceMiles(SERVICE_AREA.centre, point) <= SERVICE_AREA.radiusMiles
    );
  }

  // Type-ahead suggestions for a partial postcode. This is what makes the
  // "Enter a valid UK postcode" error impossible — you can only pick a real one.
  async autocomplete(query: string, limit = 8): Promise<string[]> {
    const q = (query || '').trim();
    if (q.length < 2) return [];
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete?limit=${limit}`,
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { result?: string[] | null };
      return Array.isArray(data?.result) ? data.result.slice(0, limit) : [];
    } catch {
      return [];
    }
  }

  // Turn a device's coordinates into the nearest postcode, so "use my location"
  // needs no typing at all.
  async reverse(
    latitude: number,
    longitude: number,
  ): Promise<{ postcode: string; latitude: number; longitude: number } | null> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes?lat=${latitude}&lon=${longitude}&limit=1&radius=2000`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result?: {
          postcode?: string;
          latitude?: number;
          longitude?: number;
        }[] | null;
      };
      const r = data?.result?.[0];
      if (
        !r?.postcode ||
        typeof r.latitude !== 'number' ||
        typeof r.longitude !== 'number'
      ) {
        return null;
      }
      return {
        postcode: r.postcode,
        latitude: r.latitude,
        longitude: r.longitude,
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
