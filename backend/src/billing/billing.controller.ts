import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { BillingService } from './billing.service';
import { UpdateContactDto } from './dto/update-contact.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';

const appUrl = () =>
  (process.env.PUBLIC_URL ?? 'http://localhost:8080').replace(/\/+$/, '');

// Where the user lands after returning from Stripe-hosted pages.
const homeAfter = () => `${appUrl()}/dashboard`;

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('me/account')
  @UseGuards(AuthGuard)
  account(@CurrentUser() u: AuthUser) {
    return this.billing.getAccount(u.id);
  }

  @Patch('me/account')
  @UseGuards(AuthGuard)
  updateContact(@CurrentUser() u: AuthUser, @Body() dto: UpdateContactDto) {
    return this.billing.updateContact(u.id, dto);
  }

  // --- Connect (payouts) ---
  @Post('connect/onboard')
  @UseGuards(AuthGuard)
  async onboard(@CurrentUser() u: AuthUser) {
    // The driver id travels in the return URL so the (public) return handler
    // can refresh status without depending on the session cookie surviving the
    // round-trip through Stripe.
    const ret = `${appUrl()}/api/v1/connect/return?d=${u.id}`;
    return this.billing.startOnboarding(u.id, { returnUrl: ret, refreshUrl: ret });
  }

  // Public: just a landing/redirect from Stripe. Never let a status-refresh
  // error block the redirect — the webhook reconciles state regardless.
  @Get('connect/return')
  async connectReturn(@Query('d') driverId: string | undefined, @Res() res: Response) {
    if (driverId) {
      try {
        await this.billing.refreshOnboarding(driverId);
      } catch {
        // ignore — account.updated webhook will sync onboarding state
      }
    }
    res.redirect(homeAfter());
  }

  @Get('connect/status')
  @UseGuards(AuthGuard)
  connectStatus(@CurrentUser() u: AuthUser) {
    return this.billing.refreshOnboarding(u.id);
  }

  // --- Subscription ---
  @Post('subscription/checkout')
  @UseGuards(AuthGuard)
  checkout(@CurrentUser() u: AuthUser) {
    return this.billing.startCheckout(u.id, {
      successUrl: `${appUrl()}/api/v1/subscription/return?d=${u.id}`,
      cancelUrl: `${appUrl()}/account`,
    });
  }

  // Public landing from Stripe Checkout. In mock mode we activate here; in real
  // mode the checkout.session.completed webhook activates the subscription.
  @Get('subscription/return')
  async subReturn(@Query('d') driverId: string | undefined, @Res() res: Response) {
    if (driverId && this.billing.isMock) {
      try {
        await this.billing.setStatus(driverId, 'active');
      } catch {
        // ignore
      }
    }
    res.redirect(homeAfter());
  }

  @Post('subscription/portal')
  @UseGuards(AuthGuard)
  portal(@CurrentUser() u: AuthUser) {
    return this.billing.createPortal(u.id, `${appUrl()}/account`);
  }

  @Post('subscription/cancel')
  @UseGuards(AuthGuard)
  cancel(@CurrentUser() u: AuthUser) {
    return this.billing.cancel(u.id);
  }
}
