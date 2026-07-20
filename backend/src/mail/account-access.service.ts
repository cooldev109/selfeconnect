import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

type Kind = 'professional' | 'customer';

/**
 * Password reset, email verification and unsubscribe — shared by both account
 * types, because the logic is identical and only the table differs.
 */
@Injectable()
export class AccountAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Every account gets a stable token so one-click unsubscribe works. */
  async ensureUnsubscribeToken(kind: Kind, id: string): Promise<string> {
    if (kind === 'professional') {
      const d = await this.prisma.driver.findUnique({
        where: { id },
        select: { unsubscribeToken: true },
      });
      if (d?.unsubscribeToken) return d.unsubscribeToken;
      const token = randomBytes(24).toString('base64url');
      await this.prisma.driver.update({
        where: { id },
        data: { unsubscribeToken: token },
      });
      return token;
    }
    const c = await this.prisma.customer.findUnique({
      where: { id },
      select: { unsubscribeToken: true },
    });
    if (c?.unsubscribeToken) return c.unsubscribeToken;
    const token = randomBytes(24).toString('base64url');
    await this.prisma.customer.update({
      where: { id },
      data: { unsubscribeToken: token },
    });
    return token;
  }

  /**
   * Always reports success, whether or not the address exists — otherwise this
   * endpoint becomes a way to discover who has an account.
   */
  async forgotPassword(email: string, kind?: Kind) {
    const addr = email.trim().toLowerCase();

    if (kind !== 'customer') {
      const driver = await this.prisma.driver.findUnique({
        where: { email: addr },
        select: { id: true, email: true, name: true },
      });
      if (driver) {
        await this.mail.sendPasswordReset({
          kind: 'professional',
          accountId: driver.id,
          email: driver.email,
          name: driver.name,
        });
        return { ok: true as const };
      }
    }
    if (kind !== 'professional') {
      const customer = await this.prisma.customer.findUnique({
        where: { email: addr },
        select: { id: true, email: true, name: true },
      });
      if (customer) {
        await this.mail.sendPasswordReset({
          kind: 'customer',
          accountId: customer.id,
          email: customer.email,
          name: customer.name,
        });
      }
    }
    return { ok: true as const };
  }

  async resetPassword(token: string, newPassword: string) {
    const claim = await this.mail.consumeToken(token, 'password_reset');
    if (!claim) throw new BadRequestException('invalid_or_expired_token');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    if (claim.kind === 'professional') {
      await this.prisma.driver.update({
        where: { id: claim.accountId },
        // Resetting the password proves control of the inbox, so the address
        // is verified as a side effect.
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
    } else {
      await this.prisma.customer.update({
        where: { id: claim.accountId },
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
    }
    return { ok: true as const, kind: claim.kind };
  }

  async verifyEmail(token: string) {
    const claim = await this.mail.consumeToken(token, 'email_verify');
    if (!claim) throw new BadRequestException('invalid_or_expired_token');
    if (claim.kind === 'professional') {
      await this.prisma.driver.update({
        where: { id: claim.accountId },
        data: { emailVerifiedAt: new Date() },
      });
    } else {
      await this.prisma.customer.update({
        where: { id: claim.accountId },
        data: { emailVerifiedAt: new Date() },
      });
    }
    return { ok: true as const, kind: claim.kind };
  }

  /** One click, no login — required for a legitimate unsubscribe link. */
  async unsubscribe(token: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true },
    });
    if (driver) {
      await this.prisma.driver.update({
        where: { id: driver.id },
        data: { notifyNewJobs: false },
      });
      return { ok: true as const, kind: 'professional' as const };
    }
    const customer = await this.prisma.customer.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true },
    });
    if (customer) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { notifyJobUpdates: false },
      });
      return { ok: true as const, kind: 'customer' as const };
    }
    throw new BadRequestException('invalid_token');
  }
}
