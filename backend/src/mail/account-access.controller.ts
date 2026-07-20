import { Body, Controller, Post } from '@nestjs/common';
import { AccountAccessService } from './account-access.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/account-access.dto';

// All public by design: someone locked out of their account can't authenticate.
@Controller()
export class AccountAccessController {
  constructor(private readonly access: AccountAccessService) {}

  @Post('auth/forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.access.forgotPassword(dto.email, dto.kind);
  }

  @Post('auth/reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.access.resetPassword(dto.token, dto.password);
  }

  @Post('auth/verify-email')
  verify(@Body() dto: TokenDto) {
    return this.access.verifyEmail(dto.token);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: TokenDto) {
    return this.access.unsubscribe(dto.token);
  }
}
