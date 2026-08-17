import { Injectable, Logger } from '@nestjs/common';

// Keyless-first, like the Stripe/mail gateways: with no SMS provider configured
// the gateway is inert and the phone-verification code is returned to the
// caller in non-production so dev + tests can complete the flow. A real
// provider (Twilio, etc.) can be dropped in later behind this same interface.
export const SMS_GATEWAY = 'SMS_GATEWAY';

export interface SmsGateway {
  readonly isMock: boolean;
  send(to: string, message: string): Promise<void>;
}

@Injectable()
export class MockSmsGateway implements SmsGateway {
  readonly isMock = true;
  private readonly log = new Logger('MockSmsGateway');
  async send(to: string, message: string): Promise<void> {
    this.log.log(`[mock sms] to=${to} :: ${message}`);
  }
}
