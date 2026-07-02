import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ProJobsController } from './pro-jobs.controller';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  // CustomerAuthModule re-exports AuthModule, so both the customer guard (job
  // owners) and the professional AuthGuard (job board) resolve here.
  imports: [CustomerAuthModule, GeoModule],
  controllers: [JobsController, ProJobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
