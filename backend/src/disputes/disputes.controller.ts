import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CustomerAuthGuard } from '../customer-auth/customer-auth.guard';
import { CurrentCustomer } from '../customer-auth/current-customer.decorator';
import type { CustomerUser } from '../customer-auth/current-customer.decorator';
import { DisputesService } from './disputes.service';
import { RaiseDisputeDto, RaiseReportDto } from './dto/dispute.dto';

// Raising disputes + abuse reports — from either side of the marketplace.
@Controller()
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  // ---- Disputes on a job ----
  @Post('jobs/:id/dispute')
  @UseGuards(CustomerAuthGuard)
  raiseAsCustomer(
    @CurrentCustomer() c: CustomerUser,
    @Param('id') id: string,
    @Body() dto: RaiseDisputeDto,
  ) {
    return this.disputes.raiseDispute(id, 'customer', c.id, dto);
  }

  @Post('pro/jobs/:id/dispute')
  @UseGuards(AuthGuard)
  raiseAsPro(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: RaiseDisputeDto,
  ) {
    return this.disputes.raiseDispute(id, 'professional', u.id, dto);
  }

  // ---- Abuse reports (report a professional / customer / job) ----
  @Post('report')
  @UseGuards(CustomerAuthGuard)
  reportAsCustomer(@CurrentCustomer() c: CustomerUser, @Body() dto: RaiseReportDto) {
    return this.disputes.raiseReport('customer', c.id, dto);
  }

  @Post('pro/report')
  @UseGuards(AuthGuard)
  reportAsPro(@CurrentUser() u: AuthUser, @Body() dto: RaiseReportDto) {
    return this.disputes.raiseReport('professional', u.id, dto);
  }
}
