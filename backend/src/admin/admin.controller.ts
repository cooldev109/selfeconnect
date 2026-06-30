import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from './admin.guard';

// All admin endpoints require an authenticated admin (AuthGuard then AdminGuard).
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.getOverview();
  }

  @Get('drivers')
  drivers() {
    return this.admin.getDrivers();
  }

  @Get('transactions')
  transactions() {
    return this.admin.getTransactions();
  }

  @Delete('drivers/:id')
  removeDriver(@Param('id') id: string) {
    return this.admin.deleteDriver(id);
  }
}
