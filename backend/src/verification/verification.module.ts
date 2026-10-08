import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { AdminVerificationController } from './admin-verification.controller';
import { SMS_GATEWAY, createSmsGateway } from './sms.gateway';

@Module({
  imports: [AuthModule], // provides AuthGuard; MailService is global
  controllers: [VerificationController, AdminVerificationController],
  providers: [
    VerificationService,
    AdminGuard,
    {
      // Real Twilio gateway when TWILIO_* env vars are set, else the inert mock
      // (dev/test surface the code). Going live = set the env vars, no code change.
      provide: SMS_GATEWAY,
      useFactory: () => createSmsGateway(),
    },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
