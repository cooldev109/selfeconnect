import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../billing/pricing.service';
import { expireLapsedComplimentary } from '../billing/complimentary';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

// Median of a numeric list (0 for empty) — robust to the outliers a mean isn't.
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

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
      pendingVerifications,
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
      this.prisma.verification.count({ where: { status: 'pending' } }),
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
      pendingVerifications,
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
    await expireLapsedComplimentary(this.prisma);
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
      // Complimentary (free) access — a future comp date and no Stripe sub.
      complimentary:
        !!d.complimentaryUntil &&
        d.complimentaryUntil > new Date() &&
        !d.stripeSubscriptionId,
      complimentaryUntil: d.complimentaryUntil?.toISOString() ?? null,
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
        // Turning access off also ends any complimentary period.
        ...(isActive ? {} : { complimentaryUntil: null }),
      },
    });
    return { ok: true, id: updated.publicId, isActive: updated.isActive };
  }

  // Grant a professional free ("complimentary") access for a number of months —
  // for launch pros. `months = 0` revokes it immediately.
  async grantComplimentary(publicId: string, months: number) {
    const driver = await this.prisma.driver.findUnique({ where: { publicId } });
    if (!driver) throw new NotFoundException('driver_not_found');
    if (driver.role !== 'driver') throw new ForbiddenException('forbidden');

    if (months <= 0) {
      const updated = await this.prisma.driver.update({
        where: { id: driver.id },
        data: { isActive: false, subscriptionStatus: 'canceled', complimentaryUntil: null },
      });
      return { ok: true, id: updated.publicId, complimentaryUntil: null };
    }

    const until = new Date();
    until.setMonth(until.getMonth() + months);
    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: true, subscriptionStatus: 'active', complimentaryUntil: until },
    });
    return {
      ok: true,
      id: updated.publicId,
      complimentaryUntil: updated.complimentaryUntil?.toISOString() ?? null,
    };
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
      orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        driver: { select: { publicId: true, name: true } },
        customer: { select: { name: true, companyName: true } },
        job: { select: { status: true } },
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
      verifiedJob: r.job?.status === 'completed',
      rating: r.rating,
      comment: r.comment ?? '',
      // M3.3 moderation state.
      hidden: r.hiddenAt != null,
      reportCount: r.reportCount,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // Reversible soft-takedown: hidden reviews leave the public profile + rating
  // but stay for the audit trail.
  async setReviewHidden(id: string, hidden: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('review_not_found');
    await this.prisma.review.update({
      where: { id },
      data: { hiddenAt: hidden ? new Date() : null },
    });
    return { ok: true, hidden };
  }

  // ---- Analytics (M3.4) ----
  async getAnalytics() {
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 3600 * 1000);
    const since56 = new Date(now - 56 * 24 * 3600 * 1000);

    const [
      totalPros,
      activePros,
      onboardedPros,
      totalCustomers,
      newPros30,
      newCustomers30,
      totalJobs,
      openJobs,
      completedJobs,
      everHiredJobs,
      cancelledJobs,
      totalQuotes,
      cancellingSubs,
      canceledSubs,
      mrr,
    ] = await Promise.all([
      this.prisma.driver.count({ where: { role: 'driver' } }),
      this.prisma.driver.count({ where: { role: 'driver', isActive: true } }),
      this.prisma.driver.count({ where: { role: 'driver', stripeOnboarded: true } }),
      this.prisma.customer.count(),
      this.prisma.driver.count({ where: { role: 'driver', createdAt: { gte: since30 } } }),
      this.prisma.customer.count({ where: { createdAt: { gte: since30 } } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: 'open' } }),
      this.prisma.job.count({ where: { status: 'completed' } }),
      this.prisma.job.count({
        where: { status: { in: ['hired', 'in_progress', 'completed'] } },
      }),
      this.prisma.job.count({ where: { status: 'cancelled' } }),
      this.prisma.quote.count(),
      this.prisma.driver.count({
        where: { role: 'driver', subscriptionCancelAtPeriodEnd: true },
      }),
      this.prisma.driver.count({ where: { role: 'driver', subscriptionStatus: 'canceled' } }),
      this.pricing.monthlyRevenue(),
    ]);

    // Jobs that never received a quote — unmet demand, the metric that most
    // signals a cold marketplace.
    const jobsWithQuotes = (
      await this.prisma.quote.findMany({ distinct: ['jobId'], select: { jobId: true } })
    ).length;
    const noQuoteJobs = Math.max(0, totalJobs - jobsWithQuotes);

    // Median response time = job posted → its first quote, in hours.
    const [firstQuotes, jobsCreated] = await Promise.all([
      this.prisma.quote.groupBy({ by: ['jobId'], _min: { createdAt: true } }),
      this.prisma.job.findMany({ select: { id: true, createdAt: true } }),
    ]);
    const createdById = new Map(jobsCreated.map((j) => [j.id, j.createdAt]));
    const responseHours: number[] = [];
    for (const q of firstQuotes) {
      const created = createdById.get(q.jobId);
      if (created && q._min.createdAt) {
        responseHours.push((q._min.createdAt.getTime() - created.getTime()) / 3_600_000);
      }
    }

    // Weekly signup trend (last 8 weeks), pros + customers combined.
    const [recentPros, recentCustomers] = await Promise.all([
      this.prisma.driver.findMany({
        where: { role: 'driver', createdAt: { gte: since56 } },
        select: { createdAt: true },
      }),
      this.prisma.customer.findMany({
        where: { createdAt: { gte: since56 } },
        select: { createdAt: true },
      }),
    ]);
    const weeks: { week: string; pros: number; customers: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 24 * 3600 * 1000;
      const end = now - i * 7 * 24 * 3600 * 1000;
      weeks.push({
        week: new Date(end).toISOString().slice(0, 10),
        pros: recentPros.filter((p) => p.createdAt.getTime() > start && p.createdAt.getTime() <= end).length,
        customers: recentCustomers.filter((c) => c.createdAt.getTime() > start && c.createdAt.getTime() <= end).length,
      });
    }

    const pct = (num: number, den: number) => (den > 0 ? round1((num / den) * 100) : 0);

    return {
      users: {
        totalPros,
        totalCustomers,
        newPros30,
        newCustomers30,
        activePros,
        onboardedPros,
      },
      jobs: {
        totalJobs,
        openJobs,
        completedJobs,
        cancelledJobs,
        noQuoteJobs,
        totalQuotes,
        quotesPerJob: totalJobs > 0 ? round1(totalQuotes / totalJobs) : 0,
      },
      conversions: {
        // signup → paying pro, job → hired, job → completed (as percentages)
        signupToActivePct: pct(activePros, totalPros),
        jobToHiredPct: pct(everHiredJobs, totalJobs),
        jobToCompletedPct: pct(completedJobs, totalJobs),
        noQuotePct: pct(noQuoteJobs, totalJobs),
      },
      revenue: {
        mrr,
        activePros,
        cancellingSubs,
        canceledSubs,
        // churn ≈ subs set to cancel at period end, over the live base.
        churnPct: pct(cancellingSubs, activePros + cancellingSubs),
      },
      responseTime: {
        medianHours: round1(median(responseHours)),
        quotedJobs: responseHours.length,
      },
      signupTrend: weeks,
    };
  }

  // Per-user history — a professional's timeline for the admin drill-down.
  async getDriverHistory(publicId: string) {
    const d = await this.prisma.driver.findUnique({
      where: { publicId },
      include: {
        quotes: { include: { job: { select: { title: true } } } },
        reviews: { include: { customer: { select: { name: true } } } },
        tips: true,
        verifications: true,
        hiredJobs: { select: { id: true, title: true, hiredAt: true, status: true } },
      },
    });
    if (!d) throw new NotFoundException('driver_not_found');

    type Ev = { at: string; kind: string; title: string; detail?: string };
    const ev: Ev[] = [];
    ev.push({ at: d.createdAt.toISOString(), kind: 'signup', title: 'Joined SelfeConnect' });
    for (const q of d.quotes) {
      ev.push({
        at: q.createdAt.toISOString(),
        kind: 'quote',
        title: `Quoted "${q.job.title}"`,
        detail: q.amount != null ? `£${(q.amount / 100).toFixed(2)}` : 'On request',
      });
    }
    for (const j of d.hiredJobs) {
      if (j.hiredAt) ev.push({ at: j.hiredAt.toISOString(), kind: 'hired', title: `Hired for "${j.title}"` });
    }
    for (const r of d.reviews) {
      ev.push({
        at: r.createdAt.toISOString(),
        kind: 'review',
        title: `${r.rating}★ review${r.customer ? ` from ${r.customer.name}` : ''}`,
        detail: r.comment ?? undefined,
      });
    }
    for (const t of d.tips) {
      ev.push({
        at: t.createdAt.toISOString(),
        kind: t.type,
        title: `${t.type === 'payment' ? 'Payment' : 'Tip'} £${(t.amount / 100).toFixed(2)}`,
        detail: t.status,
      });
    }
    for (const v of d.verifications) {
      ev.push({
        at: (v.reviewedAt ?? v.submittedAt).toISOString(),
        kind: 'verification',
        title: `${v.type} verification — ${v.status}`,
      });
    }
    ev.sort((a, b) => (a.at < b.at ? 1 : -1));

    const earnings = d.tips
      .filter((t) => t.status === 'succeeded')
      .reduce((s, t) => s + t.amount, 0);

    return {
      user: {
        publicId: d.publicId,
        name: d.name,
        email: d.email,
        role: 'professional' as const,
        joinedAt: d.createdAt.toISOString(),
        active: d.isActive,
        onboarded: d.stripeOnboarded,
        subscriptionStatus: d.subscriptionStatus,
        verified: d.verified,
      },
      stats: {
        quotes: d.quotes.length,
        hired: d.hiredJobs.length,
        reviews: d.reviews.length,
        earnings: round2(earnings / 100),
      },
      timeline: ev,
    };
  }

  // Per-user history — a customer's timeline.
  async getCustomerHistory(id: string) {
    const c = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        jobs: {
          include: { category: { select: { name: true } }, _count: { select: { quotes: true } } },
        },
        reviews: { include: { driver: { select: { name: true } } } },
      },
    });
    if (!c) throw new NotFoundException('customer_not_found');

    type Ev = { at: string; kind: string; title: string; detail?: string };
    const ev: Ev[] = [];
    ev.push({ at: c.createdAt.toISOString(), kind: 'signup', title: 'Created an account' });
    for (const j of c.jobs) {
      ev.push({
        at: j.createdAt.toISOString(),
        kind: 'job',
        title: `Posted "${j.title}"`,
        detail: `${j.category.name} · ${j.status} · ${j._count.quotes} quote(s)`,
      });
    }
    for (const r of c.reviews) {
      ev.push({
        at: r.createdAt.toISOString(),
        kind: 'review',
        title: `${r.rating}★ review of ${r.driver.name}`,
        detail: r.comment ?? undefined,
      });
    }
    ev.sort((a, b) => (a.at < b.at ? 1 : -1));

    return {
      user: {
        id: c.id,
        name: c.name,
        email: c.email,
        role: 'customer' as const,
        joinedAt: c.createdAt.toISOString(),
      },
      stats: { jobs: c.jobs.length, reviews: c.reviews.length },
      timeline: ev,
    };
  }

  // ---- Quotes ----
  async getQuotes() {
    const quotes = await this.prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        driver: { select: { publicId: true, name: true } },
        job: {
          select: {
            title: true,
            status: true,
            customer: { select: { name: true } },
          },
        },
      },
    });
    return quotes.map((q) => ({
      id: q.id,
      driverName: q.driver.name,
      driverId: q.driver.publicId,
      jobTitle: q.job.title,
      jobStatus: q.job.status,
      customerName: q.job.customer.name,
      amount: q.amount, // pence; null = "will confirm after a look"
      message: q.message,
      createdAt: q.createdAt.toISOString(),
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
