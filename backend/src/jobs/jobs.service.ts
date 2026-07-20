import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { MailService } from '../mail/mail.service';
import { AccountAccessService } from '../mail/account-access.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

const jobInclude = {
  category: true,
  hiredDriver: { select: { publicId: true, name: true, company: true } },
  _count: { select: { unlocks: true } },
} satisfies Prisma.JobInclude;
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
      // Quote cap, and how much of it is used, so the customer sees "3 of 10".
      maxContacts: j.maxContacts ?? null,
      contactCount: j._count.unlocks,
      createdAt: j.createdAt.toISOString(),
    };
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
    if (dto.status !== undefined) data.status = dto.status;
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
      } else {
        data.hiredDriver = { disconnect: true };
      }
    }

    const job = await this.prisma.job.update({
      where: { id },
      data,
      include: jobInclude,
    });
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

  private shapePro(
    j: Prisma.JobGetPayload<{
      include: { category: true; customer: true; _count: { select: { unlocks: true } } };
    }>,
    distanceMiles: number | null,
    unlocked: boolean,
  ) {
    // "Full" only matters to a pro who hasn't already unlocked it — someone who
    // reached out earlier keeps their access even after the cap is reached.
    const quotesFull =
      !unlocked && j.maxContacts != null && j._count.unlocks >= j.maxContacts;
    return {
      id: j.id,
      title: j.title,
      description: j.description,
      categorySlug: j.category.slug,
      categoryName: j.category.name,
      postcode: j.postcode,
      distanceMiles,
      workingDays: j.workingDays,
      workingHours: j.workingHours ?? null,
      budget: j.budget ?? null,
      createdAt: j.createdAt.toISOString(),
      unlocked,
      quotesFull,
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
    return filtered.map((r) => this.shapePro(r.j, r.distanceMiles, r.unlocked));
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
    return this.shapePro(job, distanceMiles, true);
  }
}
