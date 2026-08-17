import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { VerificationService } from './verification.service';
import {
  ConfirmPhoneDto,
  StartPhoneDto,
  SubmitDocumentDto,
} from './dto/verification.dto';

// The professional's own verification centre.
@Controller()
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('me/verification')
  @UseGuards(AuthGuard)
  state(@CurrentUser() user: AuthUser) {
    return this.verification.getState(user.id);
  }

  @Post('me/verification/email/resend')
  @UseGuards(AuthGuard)
  resendEmail(@CurrentUser() user: AuthUser) {
    return this.verification.resendEmail(user.id);
  }

  @Post('me/verification/phone/start')
  @UseGuards(AuthGuard)
  startPhone(@CurrentUser() user: AuthUser, @Body() dto: StartPhoneDto) {
    return this.verification.startPhone(user.id, dto.phone);
  }

  @Post('me/verification/phone/confirm')
  @UseGuards(AuthGuard)
  confirmPhone(@CurrentUser() user: AuthUser, @Body() dto: ConfirmPhoneDto) {
    return this.verification.confirmPhone(user.id, dto.code);
  }

  @Post('me/verification/:type/document')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  submitDocument(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
    @Body() dto: SubmitDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('no_file');
    return this.verification.submitDocument(user.id, type, file, dto);
  }

  @Get('me/verification/:type/document')
  @UseGuards(AuthGuard)
  ownDocument(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    return this.verification.streamOwnDocument(user.id, type, res);
  }
}
