import { Body, Controller, Param, Post } from '@nestjs/common';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';

@Controller('drivers/:publicId/tips')
export class TipsController {
  constructor(private readonly tips: TipsService) {}

  @Post()
  create(@Param('publicId') publicId: string, @Body() dto: CreateTipDto) {
    return this.tips.create(publicId, dto);
  }
}
