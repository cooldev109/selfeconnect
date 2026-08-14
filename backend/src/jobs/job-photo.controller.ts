import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';

// Job photo upload — deliberately PUBLIC (no customer session required). The
// job-first wizard lets a logged-out visitor attach photos while describing the
// work, then create their account at the final step; the upload has to happen
// before that account exists. The endpoint only stores a re-encoded, size-
// bounded webp (see JobsService.saveJobPhoto) and hands back its URL — a photo
// is tied to a customer only when a job is created with that URL, and job
// creation itself stays behind the customer guard.
@Controller('jobs')
export class JobPhotoController {
  constructor(private readonly jobs: JobsService) {}

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('no_file');
    return this.jobs.saveJobPhoto(file.buffer);
  }
}
