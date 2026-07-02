import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [CustomerAuthModule, GeoModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
