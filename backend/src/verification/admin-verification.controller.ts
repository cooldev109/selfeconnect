import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { VerificationService } from './verification.service';
import { RejectVerificationDto } from './dto/verification.dto';

// The admin review queue for document-backed verifications (M3.2 builds the UI
// on top of these). Guarded admin-only.
@Controller('admin/verifications')
@UseGuards(AuthGuard, AdminGuard)
export class AdminVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.verification.listSubmissions(status);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.verification.review(id, 'verified', user.id);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectVerificationDto,
  ) {
    return this.verification.review(id, 'rejected', user.id, dto.notes);
  }

  @Get(':id/document')
  document(@Param('id') id: string, @Res() res: Response) {
    return this.verification.streamAdminDocument(id, res);
  }
}
