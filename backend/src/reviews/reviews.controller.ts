import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { ProsService } from '../pros/pros.service';
import { SESSION_COOKIE } from '../auth/auth.guard';
import {
  CreateReviewDto,
  CreateAnonymousReviewDto,
} from './dto/create-review.dto';
import { CustomerAuthGuard } from '../customer-auth/customer-auth.guard';
import { CurrentCustomer } from '../customer-auth/current-customer.decorator';
import type { CustomerUser } from '../customer-auth/current-customer.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

@Controller()
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly pros: ProsService,
    private readonly jwt: JwtService,
  ) {}

  // Customer posts a rating + review for a professional they used.
  @Post('reviews')
  @UseGuards(CustomerAuthGuard)
  create(@CurrentCustomer() c: CustomerUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(c.id, dto);
  }

  // Public: a review left by scanning the QR code. No account, no payment.
  // Rate-limited per submitter, because "no account" also means "anyone".
  @Post('drivers/:publicId/reviews')
  createAnonymous(
    @Param('publicId') publicId: string,
    @Body() dto: CreateAnonymousReviewDto,
    @Req() req: Request,
  ) {
    // nginx overwrites X-Real-IP with the true peer address, so a client cannot
    // spoof it. (X-Forwarded-For is client-appendable, so it is not trusted
    // here.) Falls back to the socket address when running without a proxy.
    const ip =
      (req.headers['x-real-ip'] as string | undefined)?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    // If a professional is signed in, note who — so they can't review themselves.
    let driverIdFromSession: string | undefined;
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) {
      try {
        driverIdFromSession = this.jwt.verify<{ sub: string }>(token)?.sub;
      } catch {
        /* an invalid session simply means "not signed in" */
      }
    }

    return this.reviews.createAnonymous(publicId, dto, {
      ip,
      driverIdFromSession,
    });
  }

  // The signed-in professional's own received reviews + rating breakdown.
  @Get('me/reviews')
  @UseGuards(AuthGuard)
  mine(@CurrentUser() u: AuthUser) {
    return this.pros.myReviews(u.id);
  }
}
