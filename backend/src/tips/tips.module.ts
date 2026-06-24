import { Module } from '@nestjs/common';
import { TipsService } from './tips.service';
import { TipsController } from './tips.controller';
import { MeTipsController } from './me-tips.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TipsController, MeTipsController],
  providers: [TipsService],
})
export class TipsModule {}
