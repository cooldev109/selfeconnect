import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_GATEWAY, type StripeGateway } from '../stripe/gateway';
import { UpdateContactDto } from './dto/update-contact.dto';

export function isSubscriptionActive(s: SubscriptionStatus): boolean {
  return s === 'active' || s === 'trialing';
}

const PRICE_ID = () =>
  process.env.STRIPE_SUBSCRIPTION_PRICE_ID || 'price_mock_monthly';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
  ) {}

  async getAccount(driverId: string) {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d) throw new NotFoundException('not_found');
    return {
      email: d.email,
      phone: d.phone ?? '',
      subscriptionStatus: d.subscriptionStatus,
      isActive: d.isActive,
      stripeOnboarded: d.stripeOnboarded,
    };
  }

  async updateContact(driverId: string, dto: UpdateContactDto) {
    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const other = await this.prisma.driver.findUnique({ where: { email } });
      if (other && other.id !== driverId) throw new ConflictException('email_taken');
      await this.prisma.driver.update({ where: { id: driverId }, data: { email } });
    }
    if (dto.phone !== undefined) {
      await this.prisma.driver.update({
        where: { id: driverId },
        data: { phone: dto.phone },
      });
    }
    return this.getAccount(driverId);
  }

  // --- Connect (payouts) ---
  async startOnboarding(driverId: string, urls: { returnUrl: string; refreshUrl: string }) {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d) throw new NotFoundException('not_found');
    let accountId = d.stripeAccountId;
    if (!accountId) {
      const acc = await this.stripe.createConnectAccount({ email: d.email, driverId });
      accountId = acc.accountId;
      await this.prisma.driver.update({ where: { id: driverId }, data: { stripeAccountId: accountId } });
    }
    return this.stripe.createOnboardingLink({ accountId, ...urls });
  }

  async refreshOnboarding(driverId: string) {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d?.stripeAccountId) return { onboarded: false };
    const s = await this.stripe.getAccountStatus(d.stripeAccountId);
    // Destination-charge accounts receive tips via transfers; they need payouts
    // enabled (not charges) to be considered ready to accept tips.
    const onboarded = s.payoutsEnabled;
    await this.prisma.driver.update({ where: { id: driverId }, data: { stripeOnboarded: onboarded } });
    return { onboarded };
  }

  // --- Subscription (monthly fee) ---
  async startCheckout(driverId: string, urls: { successUrl: string; cancelUrl: string }) {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d) throw new NotFoundException('not_found');
    const res = await this.stripe.createSubscriptionCheckout({
      customerId: d.stripeCustomerId ?? undefined,
      email: d.email,
      priceId: PRICE_ID(),
      driverId,
      ...urls,
    });
    if (res.customerId && res.customerId !== d.stripeCustomerId) {
      await this.prisma.driver.update({ where: { id: driverId }, data: { stripeCustomerId: res.customerId } });
    }
    return { url: res.url };
  }

  async setStatus(driverId: string, status: SubscriptionStatus) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { subscriptionStatus: status, isActive: isSubscriptionActive(status) },
    });
  }

  async createPortal(driverId: string, returnUrl: string) {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d?.stripeCustomerId) throw new NotFoundException('no_customer');
    return this.stripe.createBillingPortalSession({ customerId: d.stripeCustomerId, returnUrl });
  }

  async cancel(driverId: string) {
    await this.setStatus(driverId, 'canceled');
    return { ok: true };
  }

  get isMock() {
    return this.stripe.isMock;
  }
}
