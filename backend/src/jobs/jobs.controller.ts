import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CustomerSendMessageDto } from './dto/send-message.dto';
import { EnquireDto } from './dto/enquire.dto';
import { PayJobDto } from './dto/pay-job.dto';
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

  // Start a direct, on-platform conversation with one professional from their
  // profile. Declared before ':id' routes so "enquire" isn't read as a job id.
  @Post('enquire')
  enquire(@CurrentCustomer() c: CustomerUser, @Body() dto: EnquireDto) {
    return this.jobs.enquireToPro(c.id, dto.pro, dto.message);
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

  // Chat threads on this job — one per pro the customer can message.
  @Get(':id/threads')
  threads(@CurrentCustomer() c: CustomerUser, @Param('id') id: string) {
    return this.jobs.customerThreads(c.id, id);
  }

  // Messages in the thread with one pro (?pro=<publicId>).
  @Get(':id/messages')
  messages(
    @CurrentCustomer() c: CustomerUser,
    @Param('id') id: string,
    @Query('pro') pro: string,
  ) {
    return this.jobs.customerThreadMessages(c.id, id, pro ?? '');
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentCustomer() c: CustomerUser,
    @Param('id') id: string,
    @Body() dto: CustomerSendMessageDto,
  ) {
    return this.jobs.customerSendMessage(c.id, id, dto.pro, dto.body);
  }

  // Pay the hired professional for this job through the platform (optional).
  @Post(':id/pay')
  pay(
    @CurrentCustomer() c: CustomerUser,
    @Param('id') id: string,
    @Body() dto: PayJobDto,
  ) {
    return this.jobs.payForJob(c.id, id, dto.amount);
  }

  // The Stripe-hosted receipt for a job the customer paid through the platform.
  @Get(':id/receipt')
  receipt(@CurrentCustomer() c: CustomerUser, @Param('id') id: string) {
    return this.jobs.getJobReceipt(c.id, id);
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
