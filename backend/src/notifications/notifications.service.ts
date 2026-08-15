import { Injectable } from '@nestjs/common';
import type { Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Reads and clears in-app notifications. Notifications are *created* inline by
// the code that raises the event (see JobsService) — this service is only the
// read/mark side that the bell UI talks to.
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private shape(n: Notification) {
    return {
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      jobId: n.jobId ?? null,
      read: n.readAt != null,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async listForDriver(driverId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((n) => this.shape(n));
  }

  async listForCustomer(customerId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((n) => this.shape(n));
  }

  async markAllReadDriver(driverId: string) {
    await this.prisma.notification.updateMany({
      where: { driverId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  }

  async markAllReadCustomer(customerId: string) {
    await this.prisma.notification.updateMany({
      where: { customerId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  }
}
