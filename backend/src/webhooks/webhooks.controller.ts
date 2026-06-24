import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('stripe')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  // Stripe posts events here. Public (no auth) — authenticity comes from the
  // signature header, verified against the raw request body.
  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.webhooks.handle(payload, signature ?? null);
  }
}
