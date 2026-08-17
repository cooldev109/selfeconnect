import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReviewDto,
  CreateAnonymousReviewDto,
} from './dto/create-review.dto';

// One anonymous review per person, per professional, per day. Enough to stop a
// competitor burying someone in 1-stars or a professional farming their own
// 5-stars, without putting a wall in front of a genuine customer with a QR code.
const ANON_REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Never store the address itself — only a salted hash, which is enough to
  // recognise a repeat submitter and useless for identifying a person.
  private hashIp(ip: string): string {
    const salt = process.env.JWT_SECRET ?? 'selfeconnect';
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  }

  // Someone scanned the QR code. They have no account and are paying nothing —
  // that is exactly what the flyer promises, so nothing here may require either.
  // Notably this is NOT gated on Stripe onboarding: a review involves no money,
  // so blocking it behind payment setup (as the tip endpoint does) would be
  // absurd.
  //
  // But "no account" also means "anyone", so the abuse guards live here.
  async createAnonymous(
    publicId: string,
    dto: CreateAnonymousReviewDto,
    ctx: { ip: string; driverIdFromSession?: string },
  ) {
    const driver = await this.prisma.driver.findFirst({
      where: { publicId: publicId.trim().toUpperCase(), role: 'driver' },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('professional_not_found');

    // A professional cannot review themselves while signed in as themselves.
    // (Not a complete defence on its own — the rate limit does the heavy
    // lifting — but it closes the laziest version of the attack.)
    if (ctx.driverIdFromSession && ctx.driverIdFromSession === driver.id) {
      throw new ForbiddenException('cannot_review_yourself');
    }

    const ipHash = this.hashIp(ctx.ip);
    const recent = await this.prisma.review.findFirst({
      where: {
        driverId: driver.id,
        authorIpHash: ipHash,
        createdAt: { gte: new Date(Date.now() - ANON_REVIEW_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      throw new HttpException(
        'already_reviewed_recently',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const review = await this.prisma.review.create({
      data: {
        driverId: driver.id,
        customerId: null,
        authorName: dto.authorName?.trim() || null,
        authorIpHash: ipHash,
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

  // M3.3 — flag a review as fake/abusive. One report per reporter per review;
  // repeats are idempotent (no count inflation). A professional can only report
  // reviews left on their own profile.
  async report(
    reviewId: string,
    reporterKind: 'professional' | 'customer',
    reporterId: string,
    reason: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, driverId: true },
    });
    if (!review) throw new NotFoundException('review_not_found');
    if (reporterKind === 'professional' && review.driverId !== reporterId) {
      throw new ForbiddenException('not_your_review');
    }

    try {
      await this.prisma.reviewReport.create({
        data: { reviewId, reporterKind, reporterId, reason: reason.trim() },
      });
    } catch {
      // Unique (reviewId, reporterId) violation → already reported; treat as ok.
      return { ok: true as const, alreadyReported: true };
    }
    await this.prisma.review.update({
      where: { id: reviewId },
      data: { reportCount: { increment: 1 } },
    });
    return { ok: true as const };
  }

  // Admin moderation: hide (reversible soft-takedown) / unhide a review.
  async setHidden(id: string, hidden: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('review_not_found');
    await this.prisma.review.update({
      where: { id },
      data: { hiddenAt: hidden ? new Date() : null },
    });
    return { ok: true as const, hidden };
  }
}
