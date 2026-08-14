import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CustomerAuthGuard } from '../customer-auth/customer-auth.guard';
import { CurrentCustomer } from '../customer-auth/current-customer.decorator';
import type { CustomerUser } from '../customer-auth/current-customer.decorator';

// A customer manages their own job postings. All routes require a customer
// session; ownership is enforced in the service.
@Controller('jobs')
@UseGuards(CustomerAuthGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  create(@CurrentCustomer() c: CustomerUser, @Body() dto: CreateJobDto) {
    return this.jobs.create(c.id, dto);
  }

  // Upload one job photo; returns its URL for the create/update payload.
  // Declared before ':id' routes so "photo" isn't captured as a job id.
  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('no_file');
    return this.jobs.saveJobPhoto(file.buffer);
  }

  // Declared before ':id' so it isn't captured as a job id.
  @Get('mine')
  mine(@CurrentCustomer() c: CustomerUser) {
    return this.jobs.listMine(c.id);
  }

  @Get(':id')
  get(@CurrentCustomer() c: CustomerUser, @Param('id') id: string) {
    return this.jobs.getMine(c.id, id);
  }

  // Pros who unlocked this job (candidates for "I've found my professional").
  @Get(':id/interested')
  interested(@CurrentCustomer() c: CustomerUser, @Param('id') id: string) {
    return this.jobs.interestedPros(c.id, id);
  }

  @Patch(':id')
  update(
    @CurrentCustomer() c: CustomerUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobs.update(c.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentCustomer() c: CustomerUser, @Param('id') id: string) {
    return this.jobs.remove(c.id, id);
  }
}
