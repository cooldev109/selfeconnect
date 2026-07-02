import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

const jobInclude = { category: true } satisfies Prisma.JobInclude;
type JobRow = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
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
      createdAt: j.createdAt.toISOString(),
    };
  }

  async create(customerId: string, dto: CreateJobDto) {
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
      },
      include: jobInclude,
    });
    return this.shape(job);
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
    if (dto.status !== undefined) data.status = dto.status;

    const job = await this.prisma.job.update({
      where: { id },
      data,
      include: jobInclude,
    });
    return this.shape(job);
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
      include: { category: true; customer: true };
    }>,
    distanceMiles: number | null,
    unlocked: boolean,
  ) {
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
      include: { category: true, customer: true },
    });
    // Only jobs in the pro's categories are visible/unlockable.
    if (!job || !driver.categories.some((c) => c.id === job.categoryId)) {
      throw new NotFoundException('job_not_found');
    }
    if (!driver.isActive) throw new ForbiddenException('subscription_required');

    await this.prisma.jobContactUnlock.upsert({
      where: { jobId_driverId: { jobId, driverId } },
      update: {},
      create: { jobId, driverId },
    });

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
