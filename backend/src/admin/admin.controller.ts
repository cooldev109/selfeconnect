import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from './admin.guard';
import { SetSubscriptionDto } from './dto/set-subscription.dto';

// All admin endpoints require an authenticated admin (AuthGuard then AdminGuard).
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.getOverview();
  }

  // ---- Professionals ----
  @Get('drivers')
  drivers() {
    return this.admin.getDrivers();
  }

  @Delete('drivers/:id')
  removeDriver(@Param('id') id: string) {
    return this.admin.deleteDriver(id);
  }

  // ---- Customers ----
  @Get('customers')
  customers() {
    return this.admin.getCustomers();
  }

  @Delete('customers/:id')
  removeCustomer(@Param('id') id: string) {
    return this.admin.deleteCustomer(id);
  }

  // ---- Subscriptions ----
  @Get('subscriptions')
  subscriptions() {
    return this.admin.getSubscriptions();
  }

  @Patch('subscriptions/:id')
  setSubscription(@Param('id') id: string, @Body() dto: SetSubscriptionDto) {
    return this.admin.setSubscriptionActive(id, dto.isActive);
  }

  // ---- Job postings ----
  @Get('jobs')
  jobs() {
    return this.admin.getJobs();
  }

  @Delete('jobs/:id')
  removeJob(@Param('id') id: string) {
    return this.admin.deleteJob(id);
  }

  // ---- Reviews ----
  @Get('reviews')
  reviews() {
    return this.admin.getReviews();
  }

  @Delete('reviews/:id')
  removeReview(@Param('id') id: string) {
    return this.admin.deleteReview(id);
  }

  // ---- Quotes ----
  @Get('quotes')
  quotes() {
    return this.admin.getQuotes();
  }

  // ---- Payments / transactions ----
  @Get('transactions')
  transactions() {
    return this.admin.getTransactions();
  }
}
