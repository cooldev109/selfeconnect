import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  // Photo upload lives in the public JobPhotoController (POST /jobs/photo) so
  // a logged-out visitor can attach photos before creating their account.

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

  // Quotes submitted on this job — the pitches the customer chooses from.
  @Get(':id/quotes')
  quotes(@CurrentCustomer() c: CustomerUser, @Param('id') id: string) {
    return this.jobs.listQuotes(c.id, id);
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
