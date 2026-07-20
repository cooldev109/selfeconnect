import { Global, Module } from '@nestjs/common';
import {
  MAIL_GATEWAY,
  MockMailGateway,
  ResendMailGateway,
} from './mail.gateway';
import { MailService } from './mail.service';
import { AccountAccessService } from './account-access.service';
import { AccountAccessController } from './account-access.controller';

// Global, like StripeModule: any feature can send mail without re-importing.
// With no RESEND_API_KEY the gateway is inert, so development and tests never
// send real email.
@Global()
@Module({
  providers: [
    {
      provide: MAIL_GATEWAY,
      useFactory: () => {
        const key = process.env.RESEND_API_KEY;
        if (!key) return new MockMailGateway();
        const from =
          process.env.MAIL_FROM || 'SelfeConnect <noreply@selfeconnect.com>';
        const replyTo = process.env.MAIL_REPLY_TO || 'support@selfeconnect.com';
        return new ResendMailGateway(key, from, replyTo);
      },
    },
    MailService,
    AccountAccessService,
  ],
  controllers: [AccountAccessController],
  exports: [MailService, AccountAccessService],
})
export class MailModule {}
