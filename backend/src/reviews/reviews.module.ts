import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { ProsModule } from '../pros/pros.module';

@Module({
  // CustomerAuthModule re-exports AuthModule, so both the customer guard and
  // the professional AuthGuard resolve here. ProsModule provides the shared
  // rating/review aggregation used by the pro's "My reviews".
  imports: [CustomerAuthModule, ProsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
