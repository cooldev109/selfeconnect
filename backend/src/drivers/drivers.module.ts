import { Module } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [AuthModule, GeoModule],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
