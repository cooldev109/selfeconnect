import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

const SAFE_FILE = /^[a-zA-Z0-9_-]+\.webp$/;

@Controller()
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.drivers.getMe(user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateDriverDto) {
    return this.drivers.updateMe(user.id, dto);
  }

  @Post('me/photo')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async photo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('no_file');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('bad_type');
    }
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('too_large');
    return this.drivers.savePhoto(user.id, file.buffer);
  }

  @Get('drivers/:publicId')
  getPublic(@Param('publicId') publicId: string) {
    return this.drivers.getPublic(publicId.toUpperCase());
  }

  @Get('uploads/:filename')
  upload(@Param('filename') filename: string, @Res() res: Response) {
    if (!SAFE_FILE.test(filename)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const dir = process.env.UPLOAD_DIR || 'uploads';
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(join(dir, filename))
      .on('error', () => res.status(404).json({ error: 'not_found' }))
      .pipe(res);
  }
}
