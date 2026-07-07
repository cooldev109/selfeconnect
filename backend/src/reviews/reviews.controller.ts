import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ProsService } from '../pros/pros.service';
import { CreateReviewDto } from './dto/create-review.dto';
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
  ) {}

  // Customer posts a rating + review for a professional they used.
  @Post('reviews')
  @UseGuards(CustomerAuthGuard)
  create(@CurrentCustomer() c: CustomerUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(c.id, dto);
  }

  // The signed-in professional's own received reviews + rating breakdown.
  @Get('me/reviews')
  @UseGuards(AuthGuard)
  mine(@CurrentUser() u: AuthUser) {
    return this.pros.myReviews(u.id);
  }
}
