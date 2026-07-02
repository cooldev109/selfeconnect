import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';

@Injectable()
export class ProsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  private round1(n: number) {
    return Math.round(n * 10) / 10;
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

    // Rating summaries in one query.
    const ids = drivers.map((d) => d.id);
    const aggs = ids.length
      ? await this.prisma.tip.groupBy({
          by: ['driverId'],
          where: { driverId: { in: ids }, rating: { not: null } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : [];
    const byId = new Map(aggs.map((a) => [a.driverId, a]));

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
      const a = byId.get(d.id);
      rows.push({
        publicId: d.publicId,
        name: d.name,
        company: d.company ?? null,
        photoUrl: d.photoUrl ?? null,
        categories: d.categories.map((c) => c.name),
        avgRating: a?._avg.rating ? this.round1(a._avg.rating) : 0,
        reviewCount: a?._count.rating ?? 0,
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

  // A single professional's public profile with reviews and contact details.
  async profile(publicId: string) {
    const d = await this.prisma.driver.findFirst({
      where: { publicId, role: 'driver', isActive: true },
      include: { categories: { select: { name: true, slug: true } } },
    });
    if (!d) throw new NotFoundException('professional_not_found');

    const agg = await this.prisma.tip.aggregate({
      where: { driverId: d.id, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const reviews = await this.prisma.tip.findMany({
      where: { driverId: d.id, rating: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { rating: true, message: true, customerName: true, createdAt: true },
    });

    return {
      publicId: d.publicId,
      name: d.name,
      company: d.company ?? null,
      photoUrl: d.photoUrl ?? null,
      bio: d.bio ?? null,
      city: d.city ?? null,
      postcode: d.postcode ?? null,
      categories: d.categories.map((c) => c.name),
      avgRating: agg._avg.rating ? this.round1(agg._avg.rating) : 0,
      reviewCount: agg._count.rating,
      contact: { phone: d.phone ?? null, email: d.email },
      reviews: reviews.map((r) => ({
        rating: r.rating,
        message: r.message ?? null,
        customerName: r.customerName ?? null,
        date: r.createdAt.toISOString(),
      })),
    };
  }
}
