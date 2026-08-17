import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { DisputesService } from './disputes.service';
import { ResolveDisputeDto, ResolveReportDto } from './dto/dispute.dto';

// Admin review + resolution of disputes and abuse reports.
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get('disputes')
  listDisputes(@Query('status') status?: string) {
    return this.disputes.listDisputes(status);
  }

  @Post('disputes/:id/resolve')
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputes.resolveDispute(id, dto.status, dto.notes);
  }

  @Get('reports')
  listReports(@Query('status') status?: string) {
    return this.disputes.listReports(status);
  }

  @Post('reports/:id/resolve')
  resolveReport(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.disputes.resolveReport(id, dto.status);
  }
}
