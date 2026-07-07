import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; // provides the configured JwtModule
import { GeoModule } from '../geo/geo.module';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthGuard } from './customer-auth.guard';

@Module({
  imports: [AuthModule, GeoModule],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerAuthGuard],
  // Re-export AuthModule so consumers of CustomerAuthGuard also get JwtService.
  exports: [CustomerAuthService, CustomerAuthGuard, AuthModule],
})
export class CustomerAuthModule {}
