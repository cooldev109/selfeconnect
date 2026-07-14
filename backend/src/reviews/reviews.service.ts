import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReviewDto,
  CreateAnonymousReviewDto,
} from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Someone scanned the QR code. They have no account and are paying nothing —
  // that is exactly what the flyer promises, so nothing here may require either.
  // Notably this is NOT gated on Stripe onboarding: a review involves no money,
  // so blocking it behind payment setup (as the tip endpoint does) would be
  // absurd.
  async createAnonymous(publicId: string, dto: CreateAnonymousReviewDto) {
    const driver = await this.prisma.driver.findFirst({
      where: { publicId: publicId.trim().toUpperCase(), role: 'driver' },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('professional_not_found');

    const review = await this.prisma.review.create({
      data: {
        driverId: driver.id,
        customerId: null,
        authorName: dto.authorName?.trim() || null,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
    });
    return { ok: true as const, id: review.id };
  }

  // A customer leaves (or updates) a rating + written review for a professional.
  // No payment involved — tipping is a separate, optional action.
  async create(customerId: string, dto: CreateReviewDto) {
    const driver = await this.prisma.driver.findFirst({
      where: { publicId: dto.driverPublicId.trim().toUpperCase(), role: 'driver' },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('professional_not_found');

    let jobId: string | undefined;
    if (dto.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.jobId, customerId },
        select: { id: true },
      });
      if (!job) throw new NotFoundException('job_not_found');
      jobId = job.id;
    }

    const comment = dto.comment?.trim() || null;
    const review = await this.prisma.review.upsert({
      where: { driverId_customerId: { driverId: driver.id, customerId } },
      update: { rating: dto.rating, comment, ...(jobId ? { jobId } : {}) },
      create: {
        driverId: driver.id,
        customerId,
        jobId,
        rating: dto.rating,
        comment,
      },
    });
    return { ok: true as const, id: review.id };
  }
}
