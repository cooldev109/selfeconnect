import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

// Professional (driver) job board. Requires a professional session.
@Controller('pro/jobs')
@UseGuards(AuthGuard)
export class ProJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  browse(
    @CurrentUser() user: AuthUser,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
  ) {
    let radiusMiles: number | undefined;
    if (radius !== undefined) {
      const n = parseInt(radius, 10);
      if (!Number.isNaN(n)) radiusMiles = Math.min(Math.max(n, 1), 100);
    }
    return this.jobs.browseForPro(user.id, {
      radiusMiles,
      categorySlug: category || undefined,
    });
  }

  // The professional's own pipeline — jobs they've unlocked or been hired for,
  // at any stage. Declared before ':id' so "mine" isn't captured as an id.
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.jobs.listMineForPro(user.id);
  }

  @Post(':id/unlock')
  unlock(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.jobs.unlockContact(user.id, id);
  }

  // Submit (or update) this pro's quote on a job. Also unlocks the contact.
  @Post(':id/quote')
  quote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.jobs.submitQuote(user.id, id, dto);
  }
}
