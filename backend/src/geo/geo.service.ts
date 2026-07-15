import { Injectable } from '@nestjs/common';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// The launch service area. Berkshire has no county council (abolished 1998), so
// it can't be matched on county — it is these six unitary authorities, matched
// by their stable ONS codes rather than names (names get re-spelled; codes never
// change). Expanding to a new county later is just adding its codes here.
const SERVICE_AREA_DISTRICT_CODES = new Set<string>([
  'E06000036', // Bracknell Forest
  'E06000037', // West Berkshire
  'E06000038', // Reading
  'E06000039', // Slough
  'E06000040', // Windsor and Maidenhead
  'E06000041', // Wokingham
]);

@Injectable()
export class GeoService {
  // Normalize a UK postcode and geocode it via the free postcodes.io service.
  // Returns null for empty/invalid postcodes so callers can decide how to react.
  async geocode(
    postcode: string,
  ): Promise<(GeoPoint & { district?: string; districtCode?: string }) | null> {
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
          codes?: { admin_district?: string };
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
        districtCode: r.codes?.admin_district,
      };
    } catch {
      return null;
    }
  }

  // Is this council area one we've launched in? Used to gate professional
  // registration to the launch region.
  isInServiceArea(districtCode?: string): boolean {
    return !!districtCode && SERVICE_AREA_DISTRICT_CODES.has(districtCode);
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
