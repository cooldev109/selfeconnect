import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { Prisma, type Driver } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { UpdateDriverDto } from './dto/update-driver.dto';

type Cat = { slug: string; name: string };

// Shape returned to the frontend — matches its `Driver` interface exactly.
// Note: `id` is the public short code (the UI uses driver.id for the QR/lookup).
export type DriverShape = {
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
  // Marketplace profile
  bio: string;
  postcode: string;
  categorySlugs: string[];
  categoryNames: string[];
};

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  private async shape(driver: Driver, categories: Cat[] = []): Promise<DriverShape> {
    const agg = await this.prisma.tip.aggregate({
      where: { driverId: driver.id, status: 'succeeded', rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      id: driver.publicId,
      name: driver.name,
      firstName: driver.name.trim().split(/\s+/)[0] ?? driver.name,
      company: driver.company ?? '',
      photoUrl: driver.photoUrl ?? '',
      vanPhotoUrl: driver.vanPhotoUrl ?? '',
      verified: driver.verified,
      rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      ratingsCount: agg._count.rating,
      deliveries: driver.deliveries,
      yearsActive: driver.yearsActive,
      city: driver.city ?? '',
      tagline: driver.tagline ?? '',
      bio: driver.bio ?? '',
      postcode: driver.postcode ?? '',
      categorySlugs: categories.map((c) => c.slug),
      categoryNames: categories.map((c) => c.name),
    };
  }

  async getMe(driverId: string): Promise<DriverShape> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { categories: { select: { slug: true, name: true } } },
    });
    if (!driver) throw new NotFoundException('not_found');
    return this.shape(driver, driver.categories);
  }

  async getPublic(publicId: string): Promise<DriverShape> {
    const driver = await this.prisma.driver.findUnique({
      where: { publicId },
      include: { categories: { select: { slug: true, name: true } } },
    });
    if (!driver) throw new NotFoundException('not_found');
    return this.shape(driver, driver.categories);
  }

  async updateMe(driverId: string, dto: UpdateDriverDto): Promise<DriverShape> {
    const data: Prisma.DriverUpdateInput = {
      name: dto.name,
      company: dto.company,
      phone: dto.phone,
      tagline: dto.tagline,
      city: dto.city,
      bio: dto.bio,
    };

    // Re-geocode when the postcode changes (reject invalid).
    if (dto.postcode !== undefined) {
      const pc = dto.postcode.trim();
      if (pc) {
        const g = await this.geo.geocode(pc);
        if (!g) throw new BadRequestException('invalid_postcode');
        // Same launch-radius rule as registration — a pro can't move their
        // location outside the area we serve.
        if (!this.geo.isInServiceArea(g)) {
          throw new BadRequestException('outside_service_area');
        }
        data.postcode = pc;
        data.latitude = g.latitude;
        data.longitude = g.longitude;
      }
    }

    // Replace the professional's categories (reject unknown/inactive slugs).
    if (dto.categorySlugs !== undefined) {
      const slugs = [...new Set(dto.categorySlugs)];
      const cats = await this.prisma.serviceCategory.findMany({
        where: { slug: { in: slugs }, active: true },
        select: { id: true },
      });
      if (cats.length !== slugs.length) {
        throw new BadRequestException('invalid_category');
      }
      data.categories = { set: cats.map((c) => ({ id: c.id })) };
    }

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data,
      include: { categories: { select: { slug: true, name: true } } },
    });
    return this.shape(driver, driver.categories);
  }

  async savePhoto(
    driverId: string,
    buffer: Buffer,
  ): Promise<DriverShape> {
    let webp: Buffer;
    try {
      webp = await sharp(buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException('invalid_image');
    }

    const dir = process.env.UPLOAD_DIR || 'uploads';
    await mkdir(dir, { recursive: true });
    const filename = `${driverId}.webp`;
    await writeFile(join(dir, filename), webp);

    const base = (process.env.PUBLIC_URL ?? 'http://localhost:4000').replace(
      /\/+$/,
      '',
    );
    const photoUrl = `${base}/api/v1/uploads/${filename}?v=${webp.length}`;

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { photoUrl },
      include: { categories: { select: { slug: true, name: true } } },
    });
    return this.shape(driver, driver.categories);
  }
}
