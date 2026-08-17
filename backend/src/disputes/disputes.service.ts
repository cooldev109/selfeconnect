import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  RaiseDisputeDto,
  RaiseReportDto,
} from './dto/dispute.dto';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Disputes -----------------------------------------------------------

  // Raise a dispute on a job. The raiser must be party to it — the customer who
  // owns it, or a professional who was hired for / quoted / unlocked it.
  async raiseDispute(
    jobId: string,
    kind: 'customer' | 'professional',
    raiserId: string,
    dto: RaiseDisputeDto,
  ) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, hiredDriverId: true },
    });
    if (!job) throw new NotFoundException('job_not_found');

    if (kind === 'customer') {
      if (job.customerId !== raiserId) throw new ForbiddenException('not_your_job');
    } else {
      const involved =
        job.hiredDriverId === raiserId ||
        (await this.prisma.quote.count({ where: { jobId, driverId: raiserId } })) > 0 ||
        (await this.prisma.jobContactUnlock.count({ where: { jobId, driverId: raiserId } })) > 0;
      if (!involved) throw new ForbiddenException('not_involved');
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        jobId,
        raisedByKind: kind === 'professional' ? 'professional' : 'customer',
        raisedById: raiserId,
        reason: dto.reason.trim(),
        detail: dto.detail.trim(),
      },
    });

    // Let the other party know a dispute is open on the job.
    if (kind === 'customer' && job.hiredDriverId) {
      await this.prisma.notification.create({
        data: {
          driverId: job.hiredDriverId,
          kind: 'dispute',
          title: 'A dispute was raised on a job',
          body: dto.reason,
          jobId,
        },
      });
    } else if (kind === 'professional') {
      await this.prisma.notification.create({
        data: {
          customerId: job.customerId,
          kind: 'dispute',
          title: 'A dispute was raised on your job',
          body: dto.reason,
          jobId,
        },
      });
    }

    return { ok: true as const, id: dispute.id, status: dispute.status };
  }

  async listDisputes(status?: string) {
    const where =
      status && ['open', 'resolved', 'rejected'].includes(status)
        ? { status: status as 'open' | 'resolved' | 'rejected' }
        : {};
    const rows = await this.prisma.dispute.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        job: {
          select: {
            title: true,
            status: true,
            customer: { select: { name: true } },
            hiredDriver: { select: { name: true } },
          },
        },
      },
    });
    return rows.map((d) => ({
      id: d.id,
      jobId: d.jobId,
      jobTitle: d.job.title,
      jobStatus: d.job.status,
      raisedByKind: d.raisedByKind,
      raisedBy:
        d.raisedByKind === 'customer'
          ? d.job.customer.name
          : (d.job.hiredDriver?.name ?? 'Professional'),
      customerName: d.job.customer.name,
      proName: d.job.hiredDriver?.name ?? null,
      reason: d.reason,
      detail: d.detail,
      status: d.status,
      resolutionNotes: d.resolutionNotes,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    }));
  }

  async resolveDispute(id: string, status: 'resolved' | 'rejected', notes?: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: { job: { select: { customerId: true } } },
    });
    if (!d) throw new NotFoundException('dispute_not_found');

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: { status, resolutionNotes: notes ?? null, resolvedAt: new Date() },
    });

    // Notify whoever raised it of the outcome.
    const recipient =
      d.raisedByKind === 'customer'
        ? { customerId: d.job.customerId }
        : { driverId: d.raisedById };
    await this.prisma.notification
      .create({
        data: {
          ...recipient,
          kind: 'dispute',
          title:
            status === 'resolved'
              ? 'Your dispute was resolved'
              : 'Your dispute was reviewed',
          body: notes ?? undefined,
          jobId: d.jobId,
        },
      })
      .catch(() => undefined);

    return { ok: true as const, id, status: updated.status };
  }

  // ---- Abuse reports ------------------------------------------------------

  async raiseReport(
    kind: 'customer' | 'professional',
    reporterId: string,
    dto: RaiseReportDto,
  ) {
    const report = await this.prisma.abuseReport.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        reporterKind: kind === 'professional' ? 'professional' : 'customer',
        reporterId,
        reason: dto.reason.trim(),
      },
    });
    return { ok: true as const, id: report.id };
  }

  async listReports(status?: string) {
    const where =
      status && ['open', 'actioned', 'dismissed'].includes(status)
        ? { status: status as 'open' | 'actioned' | 'dismissed' }
        : {};
    const rows = await this.prisma.abuseReport.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reporterKind: r.reporterKind,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async resolveReport(id: string, status: 'actioned' | 'dismissed') {
    const r = await this.prisma.abuseReport.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('report_not_found');
    await this.prisma.abuseReport.update({ where: { id }, data: { status } });
    return { ok: true as const, id, status };
  }
}
