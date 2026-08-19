import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type JobStatus } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { MailService } from '../mail/mail.service';
import { AccountAccessService } from '../mail/account-access.service';
import { STRIPE_GATEWAY, type StripeGateway } from '../stripe/gateway';
import { Inject } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

const jobInclude = {
  category: true,
  hiredDriver: {
    select: {
      publicId: true,
      name: true,
      company: true,
      stripeAccountId: true,
      stripeOnboarded: true,
      isActive: true,
    },
  },
  payments: { where: { status: 'succeeded' as const }, select: { id: true } },
  _count: { select: { unlocks: true } },
} satisfies Prisma.JobInclude;

// The only status changes the lifecycle allows. `closed` stays purely as a
// legacy terminal state for pre-lifecycle jobs; new flows use the states below.
const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  open: ['hired', 'cancelled', 'closed'],
  hired: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  closed: [],
};

// The timestamp column that records when a job entered each stage.
const STATUS_TIMESTAMP: Partial<Record<JobStatus, 'hiredAt' | 'startedAt' | 'completedAt' | 'cancelledAt'>> = {
  hired: 'hiredAt',
  in_progress: 'startedAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
};
type JobRow = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

// How far a professional will realistically travel for a job alert.
const NOTIFY_RADIUS_MILES = 30;

@Injectable()
export class JobsService {
  private readonly log = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly mail: MailService,
    private readonly access: AccountAccessService,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
  ) {}

  private async resolveCategoryId(slug: string) {
    const cat = await this.prisma.serviceCategory.findFirst({
      where: { slug, active: true },
      select: { id: true },
    });
    if (!cat) throw new BadRequestException('invalid_category');
    return cat.id;
  }

  private async geocodeOrThrow(postcode: string) {
    const g = await this.geo.geocode(postcode);
    if (!g) throw new BadRequestException('invalid_postcode');
    return g;
  }

  private shape(j: JobRow) {
    return {
      id: j.id,
      title: j.title,
      description: j.description,
      status: j.status,
      categorySlug: j.category.slug,
      categoryName: j.category.name,
      postcode: j.postcode,
      addressLine: j.addressLine ?? null,
      latitude: j.latitude,
      longitude: j.longitude,
      workingDays: j.workingDays,
      workingHours: j.workingHours ?? null,
      budget: j.budget ?? null,
      hiredDriverPublicId: j.hiredDriver?.publicId ?? null,
      hiredDriverName: j.hiredDriver
        ? j.hiredDriver.company || j.hiredDriver.name
        : null,
      // Optional platform payment: whether the hired pro can take payment here,
      // and whether this job has already been paid through the platform.
      canPayOnPlatform: !!(
        j.hiredDriver?.stripeAccountId &&
        j.hiredDriver.stripeOnboarded &&
        j.hiredDriver.isActive
      ),
      paidOnPlatform: j.payments.length > 0,
      // Quote cap, and how much of it is used, so the customer sees "3 of 10".
      maxContacts: j.maxContacts ?? null,
      contactCount: j._count.unlocks,
      photos: j.photos ?? [],
      timing: j.timing ?? null,
      // Lifecycle timestamps — null until the job reaches that stage.
      hiredAt: j.hiredAt?.toISOString() ?? null,
      startedAt: j.startedAt?.toISOString() ?? null,
      completedAt: j.completedAt?.toISOString() ?? null,
      cancelledAt: j.cancelledAt?.toISOString() ?? null,
      cancelReason: j.cancelReason ?? null,
      createdAt: j.createdAt.toISOString(),
    };
  }

  // Store a job photo (landscape work photo) and return its public URL. Reuses
  // the same uploads dir + serving route as profile photos.
  async saveJobPhoto(buffer: Buffer): Promise<{ url: string }> {
    let webp: Buffer;
    try {
      webp = await sharp(buffer)
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw new BadRequestException('invalid_image');
    }
    const dir = process.env.UPLOAD_DIR || 'uploads';
    await mkdir(dir, { recursive: true });
    const filename = `job_${randomUUID()}.webp`;
    await writeFile(join(dir, filename), webp);
    const base = (process.env.PUBLIC_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
    return { url: `${base}/api/v1/uploads/${filename}` };
  }

  async create(customerId: string, dto: CreateJobDto) {
    // Posting requires the customer to authorise sharing their contact details.
    if (dto.contactConsent !== true) {
      throw new BadRequestException('consent_required');
    }
    const categoryId = await this.resolveCategoryId(dto.categorySlug);
    const geo = await this.geocodeOrThrow(dto.postcode.trim());
    const job = await this.prisma.job.create({
      data: {
        customerId,
        categoryId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        postcode: dto.postcode.trim(),
        addressLine: dto.addressLine?.trim(),
        latitude: geo.latitude,
        longitude: geo.longitude,
        workingDays: dto.workingDays ?? [],
        workingHours: dto.workingHours?.trim(),
        budget: dto.budget?.trim(),
        maxContacts: dto.maxContacts ?? null,
        photos: (dto.photos ?? []).slice(0, 8),
        timing: dto.timing?.trim() || null,
        contactConsentAt: new Date(),
      },
      include: jobInclude,
    });

    // Tell matching professionals there's work — without this the board only
    // works for whoever happens to be logged in. Never blocks the response.
    void this.notifyMatchingPros(job.id);

    return this.shape(job);
  }

  /**
   * Emails active professionals in the job's trade who are within reach of it.
   * Deliberately conservative: only subscribed pros who haven't opted out, and
   * only those with a location we can measure.
   */
  private async notifyMatchingPros(jobId: string) {
    try {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        include: { category: true },
      });
      if (!job || job.status !== 'open') return;

      const pros = await this.prisma.driver.findMany({
        where: {
          role: 'driver',
          isActive: true,
          notifyNewJobs: true,
          categories: { some: { id: job.categoryId } },
        },
        select: {
          id: true,
          email: true,
          name: true,
          latitude: true,
          longitude: true,
          unsubscribeToken: true,
        },
      });

      for (const pro of pros) {
        let distanceMiles: number | null = null;
        if (
          pro.latitude != null &&
          pro.longitude != null &&
          job.latitude != null &&
          job.longitude != null
        ) {
          distanceMiles = this.round1(
            this.geo.distanceMiles(
              { latitude: pro.latitude, longitude: pro.longitude },
              { latitude: job.latitude, longitude: job.longitude },
            ),
          );
          // Out of realistic travelling range — don't email them about it.
          if (distanceMiles > NOTIFY_RADIUS_MILES) continue;
        }
        const token =
          pro.unsubscribeToken ??
          (await this.access.ensureUnsubscribeToken('professional', pro.id));
        await this.mail.sendNewJobAlert({
          email: pro.email,
          name: pro.name,
          unsubscribeToken: token,
          job: {
            title: job.title,
            category: job.category.name,
            postcode: job.postcode,
            budget: job.budget,
            distanceMiles,
          },
        });
      }
    } catch (err) {
      this.log.error(`new-job alerts failed for ${jobId}: ${String(err)}`);
    }
  }

  async listMine(customerId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { customerId },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map((j) => this.shape(j));
  }

  async getMine(customerId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, customerId },
      include: jobInclude,
    });
    if (!job) throw new NotFoundException('job_not_found');
    return this.shape(job);
  }

  async update(customerId: string, id: string, dto: UpdateJobDto) {
    const existing = await this.prisma.job.findFirst({
      where: { id, customerId },
    });
    if (!existing) throw new NotFoundException('job_not_found');

    const data: Prisma.JobUpdateInput = {};
    if (dto.categorySlug) {
      data.category = { connect: { id: await this.resolveCategoryId(dto.categorySlug) } };
    }
    if (dto.postcode) {
      const g = await this.geocodeOrThrow(dto.postcode.trim());
      data.postcode = dto.postcode.trim();
      data.latitude = g.latitude;
      data.longitude = g.longitude;
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.addressLine !== undefined) data.addressLine = dto.addressLine?.trim();
    if (dto.workingDays !== undefined) data.workingDays = dto.workingDays;
    if (dto.workingHours !== undefined) data.workingHours = dto.workingHours?.trim();
    if (dto.budget !== undefined) data.budget = dto.budget?.trim();
    if (dto.maxContacts !== undefined) data.maxContacts = dto.maxContacts;
    // A status change must be a valid lifecycle transition, and it stamps the
    // time the job entered that stage.
    if (dto.status !== undefined && dto.status !== existing.status) {
      const allowed = JOB_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException('invalid_status_transition');
      }
      data.status = dto.status;
      const stamp = STATUS_TIMESTAMP[dto.status];
      if (stamp) data[stamp] = new Date();
      if (dto.status === 'cancelled' && dto.cancelReason) {
        data.cancelReason = dto.cancelReason.trim();
      }
    }
    let hiredDriverIdToNotify: string | null = null;
    if (dto.hiredDriverPublicId !== undefined) {
      if (dto.hiredDriverPublicId) {
        const hired = await this.prisma.driver.findFirst({
          where: {
            publicId: dto.hiredDriverPublicId.trim().toUpperCase(),
            role: 'driver',
          },
          select: { id: true },
        });
        if (!hired) throw new BadRequestException('invalid_professional');
        data.hiredDriver = { connect: { id: hired.id } };
        // Only alert them if this is a change (not re-confirming the same pro).
        if (existing.hiredDriverId !== hired.id) hiredDriverIdToNotify = hired.id;
      } else {
        data.hiredDriver = { disconnect: true };
      }
    }

    const job = await this.prisma.job.update({
      where: { id },
      data,
      include: jobInclude,
    });

    // Tell the professional they've been hired.
    if (hiredDriverIdToNotify) {
      await this.prisma.notification.create({
        data: {
          driverId: hiredDriverIdToNotify,
          kind: 'hired',
          title: 'You’ve been hired!',
          body: job.title,
          jobId: job.id,
        },
      });
    }

    return this.shape(job);
  }

  // Professionals who unlocked this job's contact — i.e. those who reached out.
  // The customer picks from these when marking "I've found my professional".
  async interestedPros(customerId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, customerId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('job_not_found');

    const unlocks = await this.prisma.jobContactUnlock.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
      include: {
        driver: {
          select: {
            publicId: true,
            name: true,
            company: true,
            categories: { select: { name: true } },
          },
        },
      },
    });
    return unlocks.map((u) => ({
      publicId: u.driver.publicId,
      name: u.driver.name,
      company: u.driver.company ?? null,
      categories: u.driver.categories.map((c) => c.name),
    }));
  }

  async remove(customerId: string, id: string) {
    const existing = await this.prisma.job.findFirst({
      where: { id, customerId },
    });
    if (!existing) throw new NotFoundException('job_not_found');
    await this.prisma.job.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Professional (driver) side: browse jobs + unlock contact ----

  private round1(n: number) {
    return Math.round(n * 10) / 10;
  }

  // The pro's own quote on a job (from an include filtered to their driverId),
  // shaped for the API. Null when they haven't quoted.
  private quoteOf(j: {
    quotes?: { amount: number | null; message: string }[];
  }): { amount: number | null; message: string } | null {
    const q = j.quotes?.[0];
    return q ? { amount: q.amount ?? null, message: q.message } : null;
  }

  private shapePro(
    j: Prisma.JobGetPayload<{
      include: { category: true; customer: true; _count: { select: { unlocks: true } } };
    }>,
    distanceMiles: number | null,
    unlocked: boolean,
    hired = false,
    myQuote: { amount: number | null; message: string } | null = null,
  ) {
    // "Full" only matters to a pro who hasn't already unlocked it — someone who
    // reached out earlier keeps their access even after the cap is reached.
    const quotesFull =
      !unlocked && j.maxContacts != null && j._count.unlocks >= j.maxContacts;
    return {
      id: j.id,
      title: j.title,
      description: j.description,
      // Photos the customer attached — the pro needs to see these to quote
      // accurately, on both the job board and their "My jobs" pipeline.
      photos: j.photos ?? [],
      categorySlug: j.category.slug,
      categoryName: j.category.name,
      postcode: j.postcode,
      addressLine: j.addressLine ?? null,
      timing: j.timing ?? null,
      distanceMiles,
      workingDays: j.workingDays,
      workingHours: j.workingHours ?? null,
      budget: j.budget ?? null,
      // The lifecycle stage — powers the pro's "My jobs" pipeline.
      status: j.status,
      // True when this professional is the one the customer marked as hired.
      hired,
      createdAt: j.createdAt.toISOString(),
      unlocked,
      quotesFull,
      // This pro's own quote on the job, if they've submitted one.
      myQuote,
      // Contact is only ever populated once the pro has unlocked it.
      contact: unlocked
        ? {
            name: j.customer.companyName || j.customer.name,
            email: j.customer.email,
            phone: j.customer.phone ?? null,
            addressLine: j.addressLine ?? null,
          }
        : null,
    };
  }

  // A professional's own pipeline: every job they've unlocked or been hired
  // for, newest activity first, at whatever lifecycle stage it's reached. The
  // contact stays visible (they already unlocked it, or they're the hire).
  async listMineForPro(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { latitude: true, longitude: true },
    });
    if (!driver) throw new NotFoundException('driver_not_found');

    const jobs = await this.prisma.job.findMany({
      where: {
        OR: [{ unlocks: { some: { driverId } } }, { hiredDriverId: driverId }],
      },
      include: {
        category: true,
        customer: true,
        unlocks: { where: { driverId }, select: { id: true } },
        quotes: { where: { driverId }, select: { amount: true, message: true } },
        _count: { select: { unlocks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const hasLoc = driver.latitude != null && driver.longitude != null;
    return jobs.map((j) => {
      let distanceMiles: number | null = null;
      if (hasLoc && j.latitude != null && j.longitude != null) {
        distanceMiles = this.round1(
          this.geo.distanceMiles(
            { latitude: driver.latitude!, longitude: driver.longitude! },
            { latitude: j.latitude, longitude: j.longitude },
          ),
        );
      }
      const hired = j.hiredDriverId === driverId;
      // They can see the contact if they unlocked it or they're the hire.
      return this.shapePro(
        j,
        distanceMiles,
        j.unlocks.length > 0 || hired,
        hired,
        this.quoteOf(j),
      );
    });
  }

  // Open jobs in the professional's own categories, optionally within `radius`
  // miles of their postcode, nearest first. Contact stays hidden until unlocked.
  async browseForPro(
    driverId: string,
    opts: { radiusMiles?: number; categorySlug?: string },
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { categories: { select: { id: true, slug: true } } },
    });
    if (!driver) throw new NotFoundException('driver_not_found');

    let categoryIds = driver.categories.map((c) => c.id);
    if (opts.categorySlug) {
      const match = driver.categories.find((c) => c.slug === opts.categorySlug);
      categoryIds = match ? [match.id] : [];
    }
    if (categoryIds.length === 0) return [];

    const jobs = await this.prisma.job.findMany({
      where: { status: 'open', categoryId: { in: categoryIds } },
      include: {
        category: true,
        customer: true,
        unlocks: { where: { driverId }, select: { id: true } },
        quotes: { where: { driverId }, select: { amount: true, message: true } },
        _count: { select: { unlocks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasLoc = driver.latitude != null && driver.longitude != null;
    const rows = jobs.map((j) => {
      let distanceMiles: number | null = null;
      if (hasLoc && j.latitude != null && j.longitude != null) {
        distanceMiles = this.round1(
          this.geo.distanceMiles(
            { latitude: driver.latitude!, longitude: driver.longitude! },
            { latitude: j.latitude, longitude: j.longitude },
          ),
        );
      }
      return { j, distanceMiles, unlocked: j.unlocks.length > 0 };
    });

    let filtered = rows;
    if (hasLoc && opts.radiusMiles != null) {
      filtered = rows
        .filter((r) => r.distanceMiles != null && r.distanceMiles <= opts.radiusMiles!)
        .sort((a, b) => a.distanceMiles! - b.distanceMiles!);
    }
    return filtered.map((r) =>
      this.shapePro(r.j, r.distanceMiles, r.unlocked, false, this.quoteOf(r.j)),
    );
  }

  // Reveal a job's contact details — requires an active subscription. Idempotent.
  async unlockContact(driverId: string, jobId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { categories: { select: { id: true } } },
    });
    if (!driver) throw new NotFoundException('driver_not_found');

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        category: true,
        customer: true,
        _count: { select: { unlocks: true } },
        unlocks: { where: { driverId }, select: { id: true } },
        quotes: { where: { driverId }, select: { amount: true, message: true } },
      },
    });
    // Only jobs in the pro's categories are visible/unlockable.
    if (!job || !driver.categories.some((c) => c.id === job.categoryId)) {
      throw new NotFoundException('job_not_found');
    }
    if (!driver.isActive) throw new ForbiddenException('subscription_required');

    // Respect the customer's quote cap — but never block a pro who already
    // unlocked this job (their upsert below is a no-op, so let them through).
    const alreadyUnlocked = job.unlocks.length > 0;
    if (
      !alreadyUnlocked &&
      job.maxContacts != null &&
      job._count.unlocks >= job.maxContacts
    ) {
      throw new ForbiddenException('quotes_full');
    }

    await this.prisma.jobContactUnlock.upsert({
      where: { jobId_driverId: { jobId, driverId } },
      update: {},
      create: { jobId, driverId },
    });

    // Let the customer know to expect contact — but only the first time this
    // pro unlocks, so re-opening the job doesn't re-email them.
    if (!alreadyUnlocked && job.customer.notifyJobUpdates) {
      void (async () => {
        try {
          const token =
            job.customer.unsubscribeToken ??
            (await this.access.ensureUnsubscribeToken('customer', job.customerId));
          await this.mail.sendInterestAlert({
            email: job.customer.email,
            name: job.customer.name,
            unsubscribeToken: token,
            professionalName: driver.company || driver.name,
            jobTitle: job.title,
          });
        } catch (err) {
          this.log.error(`interest alert failed for ${jobId}: ${String(err)}`);
        }
      })();
    }

    let distanceMiles: number | null = null;
    if (
      driver.latitude != null &&
      driver.longitude != null &&
      job.latitude != null &&
      job.longitude != null
    ) {
      distanceMiles = this.round1(
        this.geo.distanceMiles(
          { latitude: driver.latitude, longitude: driver.longitude },
          { latitude: job.latitude, longitude: job.longitude },
        ),
      );
    }
    return this.shapePro(job, distanceMiles, true, false, this.quoteOf(job));
  }

  // A professional submits (or updates) their quote on a job. Quoting also
  // unlocks the contact — it's the fuller expression of "I'm interested" — so
  // it goes through the same subscription + category + cap gate as unlocking.
  async submitQuote(
    driverId: string,
    jobId: string,
    dto: { amount?: number | null; message: string },
  ) {
    // Reuse the unlock path for all the gating (active sub, job in category,
    // quote cap), the JobContactUnlock upsert, and the interest email.
    await this.unlockContact(driverId, jobId);

    const before = await this.prisma.quote.findUnique({
      where: { jobId_driverId: { jobId, driverId } },
      select: { id: true },
    });
    await this.prisma.quote.upsert({
      where: { jobId_driverId: { jobId, driverId } },
      update: {
        amount: dto.amount ?? null,
        message: dto.message.trim(),
      },
      create: {
        jobId,
        driverId,
        amount: dto.amount ?? null,
        message: dto.message.trim(),
      },
    });

    // Notify the customer on a *new* quote (not on edits).
    if (!before) {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { customerId: true, title: true },
      });
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
        select: { name: true, company: true },
      });
      if (job) {
        await this.prisma.notification.create({
          data: {
            customerId: job.customerId,
            kind: 'quote',
            title: `New quote from ${driver?.company || driver?.name || 'a professional'}`,
            body: job.title,
            jobId,
          },
        });
      }
    }

    // Return the freshly-shaped job (now carrying myQuote).
    const jobs = await this.listMineForPro(driverId);
    return jobs.find((j) => j.id === jobId) ?? { ok: true };
  }

  // Quotes on a customer's own job — the pitches they choose a pro from.
  async listQuotes(customerId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, customerId },
      select: { id: true, latitude: true, longitude: true },
    });
    if (!job) throw new NotFoundException('job_not_found');

    const quotes = await this.prisma.quote.findMany({
      where: { jobId },
      orderBy: [{ amount: 'asc' }, { createdAt: 'asc' }],
      include: {
        driver: {
          select: {
            publicId: true,
            name: true,
            company: true,
            latitude: true,
            longitude: true,
            categories: { select: { name: true } },
          },
        },
      },
    });

    return quotes.map((q) => {
      let distanceMiles: number | null = null;
      if (
        job.latitude != null &&
        job.longitude != null &&
        q.driver.latitude != null &&
        q.driver.longitude != null
      ) {
        distanceMiles = this.round1(
          this.geo.distanceMiles(
            { latitude: q.driver.latitude, longitude: q.driver.longitude },
            { latitude: job.latitude, longitude: job.longitude },
          ),
        );
      }
      return {
        publicId: q.driver.publicId,
        name: q.driver.name,
        company: q.driver.company ?? null,
        categories: q.driver.categories.map((c) => c.name),
        amount: q.amount ?? null,
        message: q.message,
        distanceMiles,
        createdAt: q.createdAt.toISOString(),
      };
    });
  }

  // ---- In-job chat (customer <-> a single pro, per job) ----

  private shapeMessage(m: {
    id: string;
    fromCustomer: boolean;
    body: string;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      fromCustomer: m.fromCustomer,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    };
  }

  // Raise a "new message" notification for the recipient — but only if they
  // don't already have an unread one for this job's thread, so a burst of
  // messages doesn't become a stack of identical alerts.
  private async notifyMessageOnce(
    recipient: { driverId: string } | { customerId: string },
    jobId: string,
    title: string,
    body?: string,
  ) {
    const existing = await this.prisma.notification.findFirst({
      where: { ...recipient, kind: 'message', jobId, readAt: null },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.notification.create({
        data: { ...recipient, kind: 'message', jobId, title, body: body ?? null },
      });
    }
  }

  // A pro may chat about a job once they've engaged with it (unlocked/quoted),
  // or if they're the hired professional. Returns the job for reuse.
  private async assertProEngaged(driverId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, hiredDriverId: true },
    });
    if (!job) throw new NotFoundException('job_not_found');
    const unlocked = await this.prisma.jobContactUnlock.findUnique({
      where: { jobId_driverId: { jobId, driverId } },
      select: { id: true },
    });
    if (!unlocked && job.hiredDriverId !== driverId) {
      throw new ForbiddenException('not_engaged');
    }
    return job;
  }

  // Resolves a pro publicId to an id and checks the customer owns the job and
  // that pro is engaged with it. Returns { driverId }.
  private async assertCustomerThread(
    customerId: string,
    jobId: string,
    proPublicId: string,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, customerId },
      select: { id: true, hiredDriverId: true },
    });
    if (!job) throw new NotFoundException('job_not_found');
    const driver = await this.prisma.driver.findFirst({
      where: { publicId: proPublicId.trim().toUpperCase(), role: 'driver' },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('professional_not_found');
    const unlocked = await this.prisma.jobContactUnlock.findUnique({
      where: { jobId_driverId: { jobId, driverId: driver.id } },
      select: { id: true },
    });
    if (!unlocked && job.hiredDriverId !== driver.id) {
      throw new ForbiddenException('not_engaged');
    }
    return { driverId: driver.id };
  }

  // The pro's thread with the customer on a job. Reading it marks the
  // customer's messages as read (clears the pro's unread badge).
  async proThreadMessages(driverId: string, jobId: string) {
    await this.assertProEngaged(driverId, jobId);
    await this.prisma.message.updateMany({
      where: { jobId, driverId, fromCustomer: true, readAt: null },
      data: { readAt: new Date() },
    });
    const messages = await this.prisma.message.findMany({
      where: { jobId, driverId },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => this.shapeMessage(m));
  }

  async proSendMessage(driverId: string, jobId: string, body: string) {
    await this.assertProEngaged(driverId, jobId);
    const m = await this.prisma.message.create({
      data: { jobId, driverId, fromCustomer: false, body: body.trim() },
    });
    // Notify the customer they have a new message.
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { customerId: true, title: true },
    });
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { name: true, company: true },
    });
    if (job) {
      await this.notifyMessageOnce(
        { customerId: job.customerId },
        jobId,
        `New message from ${driver?.company || driver?.name || 'a professional'}`,
        job.title,
      );
    }
    return this.shapeMessage(m);
  }

  // Every pro the customer can chat with on a job (those who've engaged), each
  // with a last-message preview and the customer's unread count.
  async customerThreads(customerId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, customerId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('job_not_found');

    const unlocks = await this.prisma.jobContactUnlock.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
      include: {
        driver: { select: { id: true, publicId: true, name: true, company: true } },
      },
    });

    return Promise.all(
      unlocks.map(async (u) => {
        const last = await this.prisma.message.findFirst({
          where: { jobId, driverId: u.driverId },
          orderBy: { createdAt: 'desc' },
        });
        // Unread for the customer = messages from the pro they've not read.
        const unread = await this.prisma.message.count({
          where: { jobId, driverId: u.driverId, fromCustomer: false, readAt: null },
        });
        return {
          publicId: u.driver.publicId,
          name: u.driver.name,
          company: u.driver.company ?? null,
          lastMessage: last?.body ?? null,
          lastAt: last?.createdAt.toISOString() ?? null,
          unread,
        };
      }),
    );
  }

  async customerThreadMessages(
    customerId: string,
    jobId: string,
    proPublicId: string,
  ) {
    const { driverId } = await this.assertCustomerThread(customerId, jobId, proPublicId);
    await this.prisma.message.updateMany({
      where: { jobId, driverId, fromCustomer: false, readAt: null },
      data: { readAt: new Date() },
    });
    const messages = await this.prisma.message.findMany({
      where: { jobId, driverId },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => this.shapeMessage(m));
  }

  async customerSendMessage(
    customerId: string,
    jobId: string,
    proPublicId: string,
    body: string,
  ) {
    const { driverId } = await this.assertCustomerThread(customerId, jobId, proPublicId);
    const m = await this.prisma.message.create({
      data: { jobId, driverId, fromCustomer: true, body: body.trim() },
    });
    // Notify the pro they have a new message.
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true },
    });
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, companyName: true },
    });
    await this.notifyMessageOnce(
      { driverId },
      jobId,
      `New message from ${customer?.companyName || customer?.name || 'a customer'}`,
      job?.title,
    );
    return this.shapeMessage(m);
  }

  // ---- Optional payment: a customer pays the hired pro through the platform ----

  // Creates a destination charge to the hired professional's connected account
  // (the connector model — 100% goes to the pro, no escrow) and records it as a
  // job payment. In mock mode it settles immediately; with real Stripe the
  // webhook flips it to succeeded, exactly like the QR payment flow.
  async payForJob(customerId: string, jobId: string, amount: number) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, customerId },
      include: {
        hiredDriver: {
          select: {
            id: true,
            name: true,
            company: true,
            stripeAccountId: true,
            stripeOnboarded: true,
            isActive: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException('job_not_found');
    const pro = job.hiredDriver;
    if (!pro) throw new BadRequestException('no_hired_pro');
    if (!pro.stripeAccountId || !pro.stripeOnboarded || !pro.isActive) {
      throw new BadRequestException('pro_cannot_receive_payments');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, companyName: true, email: true },
    });

    const intent = await this.stripe.createConnectedPaymentIntent({
      amount,
      currency: 'gbp',
      connectedAccountId: pro.stripeAccountId,
      metadata: { driverId: pro.id, jobId, type: 'payment' },
    });

    const tip = await this.prisma.tip.create({
      data: {
        driverId: pro.id,
        amount,
        currency: 'gbp',
        type: 'payment',
        rating: null,
        customerName: customer?.companyName || customer?.name || null,
        jobId,
        status: this.stripe.isMock ? 'succeeded' : 'pending',
        stripePaymentIntentId: intent.paymentIntentId,
      },
    });

    if (customer?.email) {
      void this.mail.sendPaymentReceipt({
        email: customer.email,
        professionalName: pro.company || pro.name,
        amount,
        kind: 'payment',
        reference: tip.id,
      });
    }

    return {
      tipId: tip.id,
      amount,
      clientSecret: intent.clientSecret,
      // The frontend needs this to scope Stripe.js to the connected account for
      // a Direct-charge confirmation.
      connectedAccountId: intent.connectedAccountId,
      mock: this.stripe.isMock,
    };
  }
}
