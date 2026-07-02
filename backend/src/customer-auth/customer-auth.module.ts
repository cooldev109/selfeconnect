import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; // provides the configured JwtModule
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthGuard } from './customer-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerAuthGuard],
  exports: [CustomerAuthService, CustomerAuthGuard],
})
export class CustomerAuthModule {}
