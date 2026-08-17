import { Module } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { AdminDisputesController } from './admin-disputes.controller';

@Module({
  // CustomerAuthModule re-exports AuthModule, so both AuthGuard + CustomerAuthGuard resolve.
  imports: [CustomerAuthModule],
  controllers: [DisputesController, AdminDisputesController],
  providers: [DisputesService, AdminGuard],
})
export class DisputesModule {}
