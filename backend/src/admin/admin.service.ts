import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../billing/pricing.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async getOverview() {
    const [
      totalDrivers,
      activeSubs,
      cancelling,
      onboarded,
      totalCustomers,
      openJobs,
      totalJobs,
      totalReviews,
      tipAgg,
      paymentAgg,
    ] = await Promise.all([
      this.prisma.driver.count({ where: { role: 'driver' } }),
      this.prisma.driver.count({ where: { role: 'driver', isActive: true } }),
      this.prisma.driver.count({
        where: { role: 'driver', subscriptionCancelAtPeriodEnd: true },
      }),
      this.prisma.driver.count({ where: { role: 'driver', stripeOnboarded: true } }),
      this.prisma.customer.count(),
      this.prisma.job.count({ where: { status: 'open' } }),
      this.prisma.job.count(),
      this.prisma.review.count(),
      this.prisma.tip.aggregate({
        where: { status: 'succeeded', type: 'tip' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.tip.aggregate({
        where: { status: 'succeeded', type: 'payment' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalDrivers,
      activeSubs,
      cancellingSubs: cancelling,
      onboardedDrivers: onboarded,
      totalCustomers,
      openJobs,
      totalJobs,
      totalReviews,
      totalTipsProcessed: round2((tipAgg._sum.amount ?? 0) / 100),
      tipCount: tipAgg._count,
      totalPaymentsProcessed: round2((paymentAgg._sum.amount ?? 0) / 100),
      paymentCount: paymentAgg._count,
      // Founding members pay less than everyone who joins after them, so this
      // is summed per professional rather than headcount x one price.
      platformRevenue: await this.pricing.monthlyRevenue(),
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
      // Tips and direct payments run on the same rails but are reported apart.
      type: t.type,
      customerName: t.customerName ?? undefined,
      rating: t.rating ?? 0,
      status: t.status,
      timestamp: t.createdAt.toISOString(),
    }));
  }

  // ---- Customers (the other half of the marketplace) ----

  async getCustomers() {
    const customers = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { jobs: true, reviews: true } } },
    });
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? '',
      type: c.type,
      companyName: c.companyName ?? '',
      postcode: c.postcode ?? '',
      jobsPosted: c._count.jobs,
      reviewsLeft: c._count.reviews,
      joinDate: c.createdAt.toISOString(),
    }));
  }

  async deleteCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('customer_not_found');
    await this.prisma.customer.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Subscriptions ----

  async getSubscriptions() {
    const drivers = await this.prisma.driver.findMany({
      where: { role: 'driver' },
      orderBy: { createdAt: 'desc' },
    });
    return drivers.map((d) => ({
      id: d.publicId,
      name: d.name,
      email: d.email,
      status: d.subscriptionStatus,
      isActive: d.isActive,
      cancelAtPeriodEnd: d.subscriptionCancelAtPeriodEnd,
      currentPeriodEnd: d.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
      stripeOnboarded: d.stripeOnboarded,
      hasStripeSubscription: !!d.stripeSubscriptionId,
      joinDate: d.createdAt.toISOString(),
    }));
  }

  // Manually switch a professional's access on or off — for support cases (a
  // failed payment that's since been settled, a goodwill extension, or
  // suspending an account). Stripe stays the source of truth for billing; this
  // only moves the platform-side flag.
  async setSubscriptionActive(publicId: string, isActive: boolean) {
    const driver = await this.prisma.driver.findUnique({ where: { publicId } });
    if (!driver) throw new NotFoundException('driver_not_found');
    if (driver.role !== 'driver') throw new ForbiddenException('forbidden');
    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        isActive,
        subscriptionStatus: isActive ? 'active' : 'canceled',
      },
    });
    return { ok: true, id: updated.publicId, isActive: updated.isActive };
  }

  // ---- Job postings ----

  async getJobs() {
    const jobs = await this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        customer: { select: { name: true, email: true, companyName: true } },
        hiredDriver: { select: { publicId: true, name: true } },
        _count: { select: { unlocks: true } },
      },
    });
    return jobs.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      category: j.category.name,
      customerName: j.customer.companyName || j.customer.name,
      customerEmail: j.customer.email,
      postcode: j.postcode,
      status: j.status,
      maxContacts: j.maxContacts ?? null,
      contactCount: j._count.unlocks,
      hiredDriverName: j.hiredDriver?.name ?? null,
      budget: j.budget ?? '',
      createdAt: j.createdAt.toISOString(),
    }));
  }

  async deleteJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('job_not_found');
    await this.prisma.job.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Reviews (moderation) ----

  async getReviews() {
    const reviews = await this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        driver: { select: { publicId: true, name: true } },
        customer: { select: { name: true, companyName: true } },
      },
    });
    return reviews.map((r) => ({
      id: r.id,
      driverId: r.driver.publicId,
      driverName: r.driver.name,
      author:
        r.customer?.companyName || r.customer?.name || r.authorName || 'Anonymous',
      // Only a review tied to a real account is verified; QR reviews are not.
      verified: r.customerId != null,
      hired: r.jobId != null,
      rating: r.rating,
      comment: r.comment ?? '',
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // Take down a review — abusive, fake, or requested for removal.
  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('review_not_found');
    await this.prisma.review.delete({ where: { id } });
    return { ok: true };
  }

  // Permanently remove a driver (and, via cascade, their tips). Admin accounts
  // are not listed in the console and may not be deleted here.
  async deleteDriver(publicId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { publicId } });
    if (!driver) throw new NotFoundException('driver_not_found');
    if (driver.role !== 'driver') {
      throw new ForbiddenException('cannot_delete_admin');
    }
    await this.prisma.driver.delete({ where: { id: driver.id } });
    return { ok: true };
  }
}
