import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobPhotoController } from './job-photo.controller';
import { ProJobsController } from './pro-jobs.controller';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { GeoModule } from '../geo/geo.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  // CustomerAuthModule re-exports AuthModule, so both the customer guard (job
  // owners) and the professional AuthGuard (job board) resolve here.
  // StripeModule provides the gateway for the optional job-payment flow.
  imports: [CustomerAuthModule, GeoModule, StripeModule],
  controllers: [JobsController, JobPhotoController, ProJobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
