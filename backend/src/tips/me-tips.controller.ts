import { Controller, Get, UseGuards } from '@nestjs/common';
import { TipsService } from './tips.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

// Authenticated dashboard data for the signed-in driver.
@Controller('me/tips')
export class MeTipsController {
  constructor(private readonly tips: TipsService) {}

  @Get()
  @UseGuards(AuthGuard)
  summary(@CurrentUser() user: AuthUser) {
    return this.tips.getSummary(user.id);
  }
}
