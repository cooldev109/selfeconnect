import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

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
