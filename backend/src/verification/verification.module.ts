import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { AdminVerificationController } from './admin-verification.controller';
import { SMS_GATEWAY, MockSmsGateway } from './sms.gateway';

@Module({
  imports: [AuthModule], // provides AuthGuard; MailService is global
  controllers: [VerificationController, AdminVerificationController],
  providers: [
    VerificationService,
    AdminGuard,
    {
      // No SMS provider wired yet → inert mock (dev/test surface the code).
      provide: SMS_GATEWAY,
      useFactory: () => new MockSmsGateway(),
    },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
