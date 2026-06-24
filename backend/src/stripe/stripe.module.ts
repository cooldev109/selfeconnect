import { Global, Module } from '@nestjs/common';
import { STRIPE_GATEWAY } from './gateway';
import { MockStripeGateway } from './mock.gateway';
import { RealStripeGateway } from './real.gateway';

@Global()
@Module({
  providers: [
    {
      provide: STRIPE_GATEWAY,
      useFactory: () => {
        const key = process.env.STRIPE_SECRET_KEY;
        return key ? new RealStripeGateway(key) : new MockStripeGateway();
      },
    },
  ],
  exports: [STRIPE_GATEWAY],
})
export class StripeModule {}
