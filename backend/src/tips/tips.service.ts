import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_GATEWAY, type StripeGateway } from '../stripe/gateway';
import { CreateTipDto } from './dto/create-tip.dto';

@Injectable()
export class TipsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
  ) {}

  async create(publicId: string, dto: CreateTipDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { publicId: publicId.toUpperCase() },
      select: { id: true, stripeAccountId: true, stripeOnboarded: true, isActive: true },
    });
    if (!driver) throw new NotFoundException('not_found');
    if (!driver.stripeAccountId || !driver.stripeOnboarded || !driver.isActive) {
      throw new ConflictException('not_accepting');
    }

    const intent = await this.stripe.createTipPaymentIntent({
      amount: dto.amount,
      currency: 'gbp',
      destinationAccountId: driver.stripeAccountId,
      metadata: { driverId: driver.id, publicId },
    });

    const tip = await this.prisma.tip.create({
      data: {
        driverId: driver.id,
        amount: dto.amount,
        currency: 'gbp',
        rating: dto.rating ?? null,
        customerName: dto.customerName ?? null,
        customerAddress: dto.customerAddress ?? null,
        message: dto.message ?? null,
        status: this.stripe.isMock ? 'succeeded' : 'pending',
        stripePaymentIntentId: intent.paymentIntentId,
      },
    });

    return {
      tipId: tip.id,
      amount: dto.amount,
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      mock: this.stripe.isMock,
    };
  }

  // Dashboard summary for the signed-in driver. Amounts are returned in pounds
  // (DB stores pence) so the frontend's existing shapes stay unchanged.
  async getSummary(driverId: string) {
    const rows = await this.prisma.tip.findMany({
      where: { driverId, status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
    });

    const tips = rows.map((t) => ({
      id: t.id,
      date: t.createdAt.toISOString(),
      amount: t.amount / 100,
      rating: t.rating ?? 0,
      customerName: t.customerName ?? undefined,
      message: t.message ?? undefined,
      area: t.customerAddress ?? undefined,
    }));

    const total = tips.reduce((s, t) => s + t.amount, 0);
    const average = tips.length ? total / tips.length : 0;
    const rated = rows.filter((t) => t.rating != null);
    const avgRating = rated.length
      ? rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length
      : 0;

    // Last 14 calendar days (server-local), one bucket per day, totals in £.
    const perDay: { day: string; total: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      const dayTotal = rows
        .filter((t) => t.createdAt >= start && t.createdAt < end)
        .reduce((s, t) => s + t.amount / 100, 0);
      perDay.push({
        day: start.toLocaleDateString('en-US', { weekday: 'short' }),
        total: Math.round(dayTotal * 100) / 100,
      });
    }
    const bestDay = perDay.reduce((a, b) => (b.total > a.total ? b : a), perDay[0]);

    let fiveStarStreak = 0;
    for (const t of rows) {
      if (t.rating === 5) fiveStarStreak++;
      else break;
    }

    return {
      tips,
      total: Math.round(total * 100) / 100,
      average: Math.round(average * 100) / 100,
      avgRating: Math.round(avgRating * 10) / 10,
      perDay,
      bestDay,
      fiveStarStreak,
    };
  }
}
