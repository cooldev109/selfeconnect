import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MONTHLY_FEE = 9.99;
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [totalDrivers, activeSubs, succeeded] = await Promise.all([
      this.prisma.driver.count({ where: { role: 'driver' } }),
      this.prisma.driver.count({ where: { role: 'driver', isActive: true } }),
      this.prisma.tip.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
    ]);

    return {
      totalDrivers,
      activeSubs,
      totalTipsProcessed: round2((succeeded._sum.amount ?? 0) / 100),
      platformRevenue: round2(activeSubs * MONTHLY_FEE),
      monthly: await this.monthlyVolume(),
    };
  }

  // Succeeded-tip volume (£) for the last 6 calendar months.
  private async monthlyVolume() {
    const now = new Date();
    const buckets = [] as {
      month: string;
      start: Date;
      end: Date;
      volume: number;
    }[];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({
        month: start.toLocaleDateString('en-US', { month: 'short' }),
        start,
        end,
        volume: 0,
      });
    }
    const tips = await this.prisma.tip.findMany({
      where: { status: 'succeeded', createdAt: { gte: buckets[0].start } },
      select: { amount: true, createdAt: true },
    });
    for (const t of tips) {
      const b = buckets.find((b) => t.createdAt >= b.start && t.createdAt < b.end);
      if (b) b.volume += t.amount / 100;
    }
    return buckets.map((b) => ({ month: b.month, volume: round2(b.volume) }));
  }

  async getDrivers() {
    const [drivers, agg] = await Promise.all([
      this.prisma.driver.findMany({
        where: { role: 'driver' },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.tip.groupBy({
        by: ['driverId'],
        where: { status: 'succeeded' },
        _sum: { amount: true },
        _avg: { rating: true },
      }),
    ]);
    const byDriver = new Map(agg.map((a) => [a.driverId, a]));

    return drivers.map((d) => {
      const a = byDriver.get(d.id);
      return {
        id: d.publicId,
        name: d.name,
        email: d.email,
        photoUrl: d.photoUrl ?? '',
        status: d.isActive ? 'active' : 'inactive',
        totalTips: round2((a?._sum.amount ?? 0) / 100),
        avgRating: a?._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0,
        joinDate: d.createdAt.toISOString(),
        phone: d.phone ?? '',
        company: d.company ?? '',
      };
    });
  }

  async getTransactions() {
    const tips = await this.prisma.tip.findMany({
      include: { driver: { select: { publicId: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return tips.map((t) => ({
      id: t.id,
      driverId: t.driver.publicId,
      driverName: t.driver.name,
      amount: round2(t.amount / 100),
      customerName: t.customerName ?? undefined,
      rating: t.rating ?? 0,
      status: t.status,
      timestamp: t.createdAt.toISOString(),
    }));
  }
}
