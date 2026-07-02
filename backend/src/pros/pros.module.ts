import { Module } from '@nestjs/common';
import { ProsService } from './pros.service';
import { ProsController } from './pros.controller';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [CustomerAuthModule, GeoModule],
  controllers: [ProsController],
  providers: [ProsService],
})
export class ProsModule {}
