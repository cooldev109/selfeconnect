import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_GATEWAY, type StripeGateway } from '../stripe/gateway';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PricingService } from './pricing.service';

export function isSubscriptionActive(s: SubscriptionStatus): boolean {
  return s === 'active' || s === 'trialing';
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
    private readonly pricing: PricingService,
  ) {}

  async getAccount(driverId: string) {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d) throw new NotFoundException('not_found');
    const plan = await this.pricing.planForAccount(d);
    return {
      email: d.email,
      priceGbp: plan.amountGbp,
      // The badge means "holds a founding place", which is only true once they
      // have claimed one — distinct from merely being quoted the lower rate.
      foundingMember: d.foundingMember,
      phone: d.phone ?? '',
      subscriptionStatus: d.subscriptionStatus,
      isActive: d.isActive,
      stripeOnboarded: d.stripeOnboarded,
      cancelAtPeriodEnd: d.subscriptionCancelAtPeriodEnd,
      currentPeriodEnd: d.subscriptionCurrentPeriodEnd
        ? d.subscriptionCurrentPeriodEnd.toISOString()
        : null,
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

    // Someone who already holds a founding spot keeps their rate when they come
    // back; only a genuinely new subscriber draws from the remaining pool. The
    // spot is claimed here so the price they are quoted is the price they get,
    // and released automatically if they never complete checkout.
    const plan = d.foundingMember
      ? this.pricing.planFor(d)
      : await this.pricing.planForNewSubscriber();
    // A placeholder id against live Stripe would fail deep inside checkout with
    // an opaque error. Fail loudly here instead — this can only mean the
    // standard price was never created after the founding places ran out.
    if (!this.stripe.isMock && plan.priceId.startsWith('price_mock')) {
      throw new ServiceUnavailableException('price_not_configured');
    }

    if (plan.founding && !d.foundingMember) {
      await this.prisma.driver.update({
        where: { id: driverId },
        data: { foundingMember: true },
      });
    }

    const res = await this.stripe.createSubscriptionCheckout({
      customerId: d.stripeCustomerId ?? undefined,
      email: d.email,
      priceId: plan.priceId,
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
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!d) throw new NotFoundException('not_found');

    // Real subscription: cancel at period end so the pro keeps access until the
    // paid period runs out. Their account then reads "Active until <date>".
    if (d.stripeSubscriptionId && !this.stripe.isMock) {
      const r = await this.stripe.cancelSubscriptionAtPeriodEnd(
        d.stripeSubscriptionId,
      );
      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          subscriptionCancelAtPeriodEnd: r.cancelAtPeriodEnd,
          subscriptionCurrentPeriodEnd: r.currentPeriodEnd
            ? new Date(r.currentPeriodEnd * 1000)
            : null,
        },
      });
      return { ok: true };
    }

    // Mock / no known subscription: fall back to marking it cancelled now.
    await this.setStatus(driverId, 'canceled');
    return { ok: true };
  }

  get isMock() {
    return this.stripe.isMock;
  }
}
