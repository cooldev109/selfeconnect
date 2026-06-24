import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { SubscriptionStatus, TipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  STRIPE_GATEWAY,
  type StripeGateway,
  type WebhookEvent,
} from '../stripe/gateway';

// Maps a Stripe subscription.status to our SubscriptionStatus enum.
function mapSubscriptionStatus(status: unknown): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}

const ACTIVE = (s: SubscriptionStatus) => s === 'active' || s === 'trialing';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
  ) {}

  async handle(payload: string | Buffer, signature: string | null) {
    let event: WebhookEvent;
    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch (err) {
      this.logger.warn(`webhook verification failed: ${(err as Error).message}`);
      throw new BadRequestException('invalid_signature');
    }

    // Idempotency: a given Stripe event is processed at most once. The unique
    // primary key on WebhookEvent.id makes the create the atomic guard.
    const already = await this.prisma.webhookEvent.findUnique({
      where: { id: event.id },
    });
    if (already) return { received: true, duplicate: true };

    await this.process(event);

    try {
      await this.prisma.webhookEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch {
      // Concurrent delivery already recorded it — safe to ignore.
    }

    return { received: true, type: event.type };
  }

  private async process(event: WebhookEvent) {
    const obj = event.data.object as Record<string, unknown>;
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.setTipStatus(obj.id as string, 'succeeded');
        break;
      case 'payment_intent.payment_failed':
        await this.setTipStatus(obj.id as string, 'failed');
        break;
      case 'charge.refunded':
        await this.setTipStatus(obj.payment_intent as string, 'refunded');
        break;
      case 'account.updated':
        await this.updateConnect(obj);
        break;
      case 'checkout.session.completed':
        await this.checkoutCompleted(obj);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.setSubscriptionByCustomer(
          obj.customer as string,
          mapSubscriptionStatus(obj.status),
        );
        break;
      case 'customer.subscription.deleted':
        await this.setSubscriptionByCustomer(obj.customer as string, 'canceled');
        break;
      default:
        // Unhandled event types are acknowledged but ignored.
        break;
    }
  }

  private async setTipStatus(paymentIntentId: string | undefined, status: TipStatus) {
    if (!paymentIntentId) return;
    await this.prisma.tip.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status },
    });
  }

  // Connect account onboarding finished/changed.
  private async updateConnect(account: Record<string, unknown>) {
    const accountId = account.id as string | undefined;
    if (!accountId) return;
    // Tips arrive via destination transfers, so payouts-enabled is what matters.
    const onboarded = Boolean(account.payouts_enabled);
    await this.prisma.driver.updateMany({
      where: { stripeAccountId: accountId },
      data: { stripeOnboarded: onboarded },
    });
  }

  // Subscription checkout completed — activate the driver and capture the
  // customer id so later subscription.* events can find them.
  private async checkoutCompleted(session: Record<string, unknown>) {
    if (session.mode !== 'subscription') return;
    const driverId = (session.metadata as Record<string, string> | undefined)
      ?.driverId;
    const customerId =
      typeof session.customer === 'string' ? session.customer : undefined;

    if (driverId) {
      await this.prisma.driver.updateMany({
        where: { id: driverId },
        data: {
          subscriptionStatus: 'active',
          isActive: true,
          ...(customerId ? { stripeCustomerId: customerId } : {}),
        },
      });
    } else if (customerId) {
      await this.setSubscriptionByCustomer(customerId, 'active');
    }
  }

  private async setSubscriptionByCustomer(
    customerId: string | undefined,
    status: SubscriptionStatus,
  ) {
    if (!customerId) return;
    await this.prisma.driver.updateMany({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: status, isActive: ACTIVE(status) },
    });
  }
}
