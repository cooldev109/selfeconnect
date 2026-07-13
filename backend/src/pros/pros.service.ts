import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';

// A rating summary combining legacy tip ratings and standalone reviews.
export type RatingSummary = {
  avgRating: number;
  reviewCount: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

// A single review row shown on a professional's profile / "My reviews".
export type ReviewItem = {
  rating: number;
  comment: string | null;
  author: string;
  date: string;
  verified: boolean; // left by a registered SelfeConnect customer
  hired: boolean; // linked to a job they hired for
};

@Injectable()
export class ProsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  private round1(n: number) {
    return Math.round(n * 10) / 10;
  }

  private emptyBreakdown(): Record<1 | 2 | 3 | 4 | 5, number> {
    return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  }

  // Combined rating summary per driver, blending Tip.rating + Review.rating.
  private async ratingSummary(
    driverIds: string[],
  ): Promise<Map<string, RatingSummary>> {
    const map = new Map<string, RatingSummary>();
    if (driverIds.length === 0) return map;

    const [tipGroups, reviewGroups] = await Promise.all([
      this.prisma.tip.groupBy({
        by: ['driverId', 'rating'],
        where: { driverId: { in: driverIds }, rating: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.review.groupBy({
        by: ['driverId', 'rating'],
        where: { driverId: { in: driverIds } },
        _count: { _all: true },
      }),
    ]);

    const acc = new Map<
      string,
      { sum: number; count: number; breakdown: Record<number, number> }
    >();
    const bump = (driverId: string, rating: number, n: number) => {
      const e =
        acc.get(driverId) ??
        (() => {
          const v = { sum: 0, count: 0, breakdown: {} as Record<number, number> };
          acc.set(driverId, v);
          return v;
        })();
      e.sum += rating * n;
      e.count += n;
      e.breakdown[rating] = (e.breakdown[rating] ?? 0) + n;
    };
    for (const g of tipGroups) {
      if (g.rating != null) bump(g.driverId, g.rating, g._count._all);
    }
    for (const g of reviewGroups) {
      bump(g.driverId, g.rating, g._count._all);
    }

    for (const id of driverIds) {
      const e = acc.get(id);
      const breakdown = this.emptyBreakdown();
      if (e) {
        for (const s of [1, 2, 3, 4, 5] as const) {
          breakdown[s] = e.breakdown[s] ?? 0;
        }
      }
      map.set(id, {
        avgRating: e && e.count ? this.round1(e.sum / e.count) : 0,
        reviewCount: e?.count ?? 0,
        breakdown,
      });
    }
    return map;
  }

  // Merged, display-ready review list for one driver (reviews + rated tips).
  private async reviewsForDriver(
    driverId: string,
    take = 12,
  ): Promise<ReviewItem[]> {
    const [reviews, tips] = await Promise.all([
      this.prisma.review.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
        take,
        include: { customer: { select: { name: true, companyName: true } } },
      }),
      this.prisma.tip.findMany({
        where: { driverId, rating: { not: null } },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          rating: true,
          message: true,
          customerName: true,
          createdAt: true,
        },
      }),
    ]);

    const items: ReviewItem[] = [
      ...reviews.map((r) => ({
        rating: r.rating,
        comment: r.comment ?? null,
        author: r.customer.companyName || r.customer.name || 'Customer',
        date: r.createdAt.toISOString(),
        verified: true,
        hired: r.jobId != null,
      })),
      ...tips.map((t) => ({
        rating: t.rating as number,
        comment: t.message ?? null,
        author: t.customerName || 'Anonymous',
        date: t.createdAt.toISOString(),
        verified: false,
        hired: false,
      })),
    ];
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    return items.slice(0, take);
  }

  // Search active professionals by category, within `radius` miles of a
  // postcode, nearest first (then best-rated). Only subscribed pros appear.
  async browse(opts: {
    categorySlug?: string;
    postcode?: string;
    radiusMiles?: number;
  }) {
    let origin: { latitude: number; longitude: number } | null = null;
    if (opts.postcode) {
      origin = await this.geo.geocode(opts.postcode.trim());
      if (!origin) throw new BadRequestException('invalid_postcode');
    }

    let categoryId: string | undefined;
    if (opts.categorySlug) {
      const c = await this.prisma.serviceCategory.findFirst({
        where: { slug: opts.categorySlug, active: true },
        select: { id: true },
      });
      if (!c) throw new BadRequestException('invalid_category');
      categoryId = c.id;
    }

    const drivers = await this.prisma.driver.findMany({
      where: {
        role: 'driver',
        isActive: true,
        ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
      },
      include: { categories: { select: { name: true, slug: true } } },
    });

    const summaries = await this.ratingSummary(drivers.map((d) => d.id));

    const rows: {
      publicId: string;
      name: string;
      company: string | null;
      photoUrl: string | null;
      categories: string[];
      avgRating: number;
      reviewCount: number;
      distanceMiles: number | null;
    }[] = [];
    for (const d of drivers) {
      let distanceMiles: number | null = null;
      if (origin && d.latitude != null && d.longitude != null) {
        distanceMiles = this.round1(
          this.geo.distanceMiles(origin, {
            latitude: d.latitude,
            longitude: d.longitude,
          }),
        );
      }
      // When searching by radius, drop pros out of range or without a location.
      if (
        origin &&
        opts.radiusMiles != null &&
        (distanceMiles == null || distanceMiles > opts.radiusMiles)
      ) {
        continue;
      }
      const s = summaries.get(d.id);
      rows.push({
        publicId: d.publicId,
        name: d.name,
        company: d.company ?? null,
        photoUrl: d.photoUrl ?? null,
        categories: d.categories.map((c) => c.name),
        avgRating: s?.avgRating ?? 0,
        reviewCount: s?.reviewCount ?? 0,
        distanceMiles,
      });
    }

    rows.sort(
      (x, y) =>
        (x.distanceMiles ?? Number.MAX_SAFE_INTEGER) -
          (y.distanceMiles ?? Number.MAX_SAFE_INTEGER) ||
        y.avgRating - x.avgRating,
    );
    return rows;
  }

  // A professional's public profile. Anyone may read it — the reviews and the
  // rating are the point of a public profile. Contact details are the one thing
  // held back until the visitor has a (free) customer account.
  async profile(publicId: string, opts: { includeContact: boolean }) {
    const d = await this.prisma.driver.findFirst({
      where: { publicId, role: 'driver', isActive: true },
      include: { categories: { select: { name: true, slug: true } } },
    });
    if (!d) throw new NotFoundException('professional_not_found');

    const summaries = await this.ratingSummary([d.id]);
    const summary = summaries.get(d.id)!;
    const reviews = await this.reviewsForDriver(d.id);

    return {
      publicId: d.publicId,
      name: d.name,
      company: d.company ?? null,
      photoUrl: d.photoUrl ?? null,
      bio: d.bio ?? null,
      city: d.city ?? null,
      postcode: d.postcode ?? null,
      categories: d.categories.map((c) => c.name),
      avgRating: summary.avgRating,
      reviewCount: summary.reviewCount,
      breakdown: summary.breakdown,
      // Never serialise the email/phone for an anonymous visitor — hiding it in
      // the UI alone would still ship it in the JSON.
      contact: opts.includeContact
        ? { phone: d.phone ?? null, email: d.email }
        : null,
      contactLocked: !opts.includeContact,
      reviews,
    };
  }

  // The signed-in professional's own reviews (for their "My reviews" page).
  async myReviews(driverId: string) {
    const summaries = await this.ratingSummary([driverId]);
    const summary = summaries.get(driverId)!;
    const reviews = await this.reviewsForDriver(driverId, 50);
    return {
      avgRating: summary.avgRating,
      reviewCount: summary.reviewCount,
      breakdown: summary.breakdown,
      reviews,
    };
  }
}
