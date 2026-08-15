import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CustomerNotificationsController } from './customer-notifications.controller';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  // CustomerAuthModule re-exports AuthModule, so both guards resolve here.
  imports: [CustomerAuthModule],
  controllers: [NotificationsController, CustomerNotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
