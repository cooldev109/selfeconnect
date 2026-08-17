import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Response } from 'express';
import type { VerificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SMS_GATEWAY, type SmsGateway } from './sms.gateway';
import {
  computeVerificationBadges,
  type VerificationBadges,
} from './badges';
import type { SubmitDocumentDto } from './dto/verification.dto';

const DOC_TYPES = ['identity', 'insurance', 'qualification'] as const;
type DocType = (typeof DOC_TYPES)[number];

// Document upload limits. Verification docs may be PDFs (unlike the image-only
// profile/gallery uploads), so we accept PDF + common image types and store
// them privately (never the public /uploads route).
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const SAFE_DOC = /^ver_[a-zA-Z0-9_-]+\.(pdf|jpg|png|webp)$/;
const PHONE_CODE_TTL_MS = 10 * 60 * 1000;

const TYPE_LABEL: Record<DocType, string> = {
  identity: 'Identity',
  insurance: 'Insurance',
  qualification: 'Qualification',
};

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function verificationDir(): string {
  return join(process.env.UPLOAD_DIR || 'uploads', 'verification');
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(SMS_GATEWAY) private readonly sms: SmsGateway,
  ) {}

  private assertDocType(type: string): DocType {
    if (!(DOC_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException('bad_type');
    }
    return type as DocType;
  }

  // ---- The professional's own verification centre --------------------------

  async getState(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        verified: true,
        verifications: {
          select: {
            type: true,
            status: true,
            label: true,
            reference: true,
            expiresAt: true,
            documentUrl: true,
            reviewerNotes: true,
            submittedAt: true,
            reviewedAt: true,
          },
        },
      },
    });
    if (!driver) throw new NotFoundException('driver_not_found');

    const byType = new Map(driver.verifications.map((v) => [v.type, v]));
    const doc = (t: DocType) => {
      const v = byType.get(t);
      if (!v) return { status: 'none' as const };
      return {
        status: v.status,
        label: v.label,
        reference: v.reference,
        expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
        hasDocument: v.documentUrl != null,
        reviewerNotes: v.reviewerNotes,
        submittedAt: v.submittedAt.toISOString(),
        reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      };
    };

    return {
      email: { verified: driver.emailVerifiedAt != null, address: driver.email },
      phone: {
        verified: driver.phoneVerifiedAt != null,
        number: driver.phone ?? null,
      },
      identity: doc('identity'),
      insurance: doc('insurance'),
      qualification: doc('qualification'),
      badges: computeVerificationBadges(driver),
    };
  }

  async resendEmail(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });
    if (!driver) throw new NotFoundException('driver_not_found');
    if (driver.emailVerifiedAt) return { ok: true as const, alreadyVerified: true };
    await this.mail.sendEmailVerification({
      kind: 'professional',
      accountId: driver.id,
      email: driver.email,
      name: driver.name,
    });
    return { ok: true as const };
  }

  // ---- Phone verification (6-digit code via the SMS gateway) ---------------

  async startPhone(driverId: string, phone?: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { phone: true },
    });
    if (!driver) throw new NotFoundException('driver_not_found');
    const number = (phone ?? driver.phone ?? '').trim();
    if (number.length < 6) throw new BadRequestException('no_phone');

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        // Adopting a new number resets any prior verified state for it.
        ...(phone ? { phone: number, phoneVerifiedAt: null } : {}),
        phoneVerifyCodeHash: sha256(code),
        phoneVerifyExpiresAt: new Date(Date.now() + PHONE_CODE_TTL_MS),
      },
    });
    await this.sms.send(
      number,
      `Your SelfeConnect verification code is ${code}. It expires in 10 minutes.`,
    );

    // In mock mode (no SMS provider) surface the code outside production so the
    // flow is completable in dev + automated tests.
    const devCode =
      this.sms.isMock && process.env.NODE_ENV !== 'production' ? code : undefined;
    return { ok: true as const, mock: this.sms.isMock, devCode };
  }

  async confirmPhone(driverId: string, code: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { phoneVerifyCodeHash: true, phoneVerifyExpiresAt: true },
    });
    if (!driver) throw new NotFoundException('driver_not_found');
    if (
      !driver.phoneVerifyCodeHash ||
      !driver.phoneVerifyExpiresAt ||
      driver.phoneVerifyExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('code_expired');
    }
    if (sha256(code) !== driver.phoneVerifyCodeHash) {
      throw new BadRequestException('bad_code');
    }
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        phoneVerifiedAt: new Date(),
        phoneVerifyCodeHash: null,
        phoneVerifyExpiresAt: null,
      },
    });
    return { ok: true as const, verified: true };
  }

  // ---- Document submission (identity / insurance / qualification) ----------

  async submitDocument(
    driverId: string,
    typeRaw: string,
    file: Express.Multer.File | undefined,
    dto: SubmitDocumentDto,
  ) {
    const type = this.assertDocType(typeRaw);
    if (!file) throw new BadRequestException('no_file');
    const ext = MIME_EXT[file.mimetype];
    if (!ext) throw new BadRequestException('bad_file_type');
    if (file.size > MAX_DOC_BYTES) throw new BadRequestException('too_large');

    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      const d = new Date(dto.expiresAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('bad_expiry');
      expiresAt = d;
    }

    const dir = verificationDir();
    await mkdir(dir, { recursive: true });
    const filename = `ver_${randomUUID()}.${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    // Replace any previous document for this (driver, type) so the folder
    // doesn't accumulate orphans on re-submission.
    const prior = await this.prisma.verification.findUnique({
      where: { driverId_type: { driverId, type: type as VerificationType } },
      select: { documentUrl: true },
    });
    if (prior?.documentUrl && SAFE_DOC.test(prior.documentUrl)) {
      await unlink(join(dir, prior.documentUrl)).catch(() => undefined);
    }

    const row = await this.prisma.verification.upsert({
      where: { driverId_type: { driverId, type: type as VerificationType } },
      create: {
        driverId,
        type: type as VerificationType,
        status: 'pending',
        documentUrl: filename,
        label: dto.label ?? null,
        reference: dto.reference ?? null,
        expiresAt,
      },
      update: {
        status: 'pending',
        documentUrl: filename,
        label: dto.label ?? null,
        reference: dto.reference ?? null,
        expiresAt,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewerId: null,
        reviewerNotes: null,
      },
    });
    return { id: row.id, type: row.type, status: row.status };
  }

  async streamOwnDocument(driverId: string, typeRaw: string, res: Response) {
    const type = this.assertDocType(typeRaw);
    const row = await this.prisma.verification.findUnique({
      where: { driverId_type: { driverId, type: type as VerificationType } },
      select: { documentUrl: true },
    });
    this.streamDocument(row?.documentUrl ?? null, res);
  }

  // ---- Admin review queue --------------------------------------------------

  async listSubmissions(status?: string) {
    const where =
      status && ['pending', 'verified', 'rejected'].includes(status)
        ? { status: status as 'pending' | 'verified' | 'rejected' }
        : {};
    const rows = await this.prisma.verification.findMany({
      where,
      orderBy: { submittedAt: 'asc' },
      include: {
        driver: { select: { publicId: true, name: true, email: true, company: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      label: r.label,
      reference: r.reference,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      hasDocument: r.documentUrl != null,
      submittedAt: r.submittedAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      reviewerNotes: r.reviewerNotes,
      driver: r.driver,
    }));
  }

  async review(
    id: string,
    decision: 'verified' | 'rejected',
    reviewerId: string,
    notes?: string,
  ) {
    const existing = await this.prisma.verification.findUnique({
      where: { id },
      select: { id: true, driverId: true, type: true },
    });
    if (!existing) throw new NotFoundException('verification_not_found');

    const row = await this.prisma.verification.update({
      where: { id },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewerId,
        reviewerNotes: decision === 'rejected' ? (notes ?? null) : null,
      },
    });

    // Identity is the headline trust signal — mirror it onto the legacy
    // Driver.verified flag so existing UI that reads it lights up too.
    if (existing.type === 'identity') {
      await this.prisma.driver.update({
        where: { id: existing.driverId },
        data: { verified: decision === 'verified' },
      });
    }

    const label = TYPE_LABEL[existing.type as DocType];
    await this.prisma.notification.create({
      data: {
        driverId: existing.driverId,
        kind: 'verification',
        title:
          decision === 'verified'
            ? `${label} verified`
            : `${label} check couldn't be approved`,
        body:
          decision === 'verified'
            ? `Your ${label.toLowerCase()} check was approved — the badge now shows on your profile.`
            : (notes ?? `Please review your ${label.toLowerCase()} document and re-submit.`),
      },
    });

    return { id: row.id, type: row.type, status: row.status };
  }

  async streamAdminDocument(id: string, res: Response) {
    const row = await this.prisma.verification.findUnique({
      where: { id },
      select: { documentUrl: true },
    });
    this.streamDocument(row?.documentUrl ?? null, res);
  }

  // ---- shared private-document streamer ------------------------------------

  private streamDocument(filename: string | null, res: Response) {
    if (!filename || !SAFE_DOC.test(filename)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const ext = filename.split('.').pop() as string;
    res.setHeader('Content-Type', EXT_MIME[ext] ?? 'application/octet-stream');
    // Private, sensitive — never cache in shared caches.
    res.setHeader('Cache-Control', 'private, no-store');
    createReadStream(join(verificationDir(), filename))
      .on('error', () => res.status(404).json({ error: 'not_found' }))
      .pipe(res);
  }

  // Exposed for tests / other services that hold a Driver row.
  badgesFor = computeVerificationBadges;
  badgeSummary(driver: Parameters<typeof computeVerificationBadges>[0]): VerificationBadges {
    return computeVerificationBadges(driver);
  }
}
