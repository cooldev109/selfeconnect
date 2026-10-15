import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { AdminVerificationController } from './admin-verification.controller';
import { PHONE_VERIFIER, createPhoneVerifier } from './phone-verifier';

@Module({
  imports: [AuthModule], // provides AuthGuard; MailService is global
  controllers: [VerificationController, AdminVerificationController],
  providers: [
    VerificationService,
    AdminGuard,
    {
      // Twilio Verify when the TWILIO_* env vars are set, else the inert mock
      // (dev/test surface the code). Going live = set the env vars, no code change.
      provide: PHONE_VERIFIER,
      useFactory: () => createPhoneVerifier(),
    },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
