import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StripeModule } from './stripe/stripe.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { BillingModule } from './billing/billing.module';
import { TipsModule } from './tips/tips.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StripeModule,
    AuthModule,
    DriversModule,
    BillingModule,
    TipsModule,
    WebhooksModule,
    AdminModule,
    CategoriesModule,
    CustomerAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
