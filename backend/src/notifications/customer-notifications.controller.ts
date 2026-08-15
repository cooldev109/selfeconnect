import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CustomerAuthGuard } from '../customer-auth/customer-auth.guard';
import { CurrentCustomer } from '../customer-auth/current-customer.decorator';
import type { CustomerUser } from '../customer-auth/current-customer.decorator';

// Customer notification bell.
@Controller('customer/notifications')
@UseGuards(CustomerAuthGuard)
export class CustomerNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentCustomer() c: CustomerUser) {
    return this.notifications.listForCustomer(c.id);
  }

  @Post('read')
  readAll(@CurrentCustomer() c: CustomerUser) {
    return this.notifications.markAllReadCustomer(c.id);
  }
}
