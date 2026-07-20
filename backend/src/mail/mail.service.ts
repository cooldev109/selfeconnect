import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_GATEWAY, type MailGateway } from './mail.gateway';
import { shell, p, strong, toText, escapeHtml } from './templates';

const APP_URL = process.env.APP_URL || 'https://selfeconnect.com';
const SUPPORT = 'support@selfeconnect.com';
// Short-lived: long enough to find the email, short enough to limit exposure.
const RESET_TTL_MIN = 60;
const VERIFY_TTL_HOURS = 48;

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_GATEWAY) private readonly mail: MailGateway,
  ) {}

  get isMock() {
    return this.mail.isMock;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sending must never break the thing that triggered it. A signup that works
   * but whose welcome email fails is fine; a signup that 500s because an email
   * provider hiccuped is not.
   */
  private async safeSend(input: Parameters<MailGateway['send']>[0]) {
    try {
      await this.mail.send({ ...input, text: input.text ?? toText(input.html) });
      return true;
    } catch (err) {
      this.log.error(
        `email failed (${input.subject} → ${input.to}): ${String(err)}`,
      );
      return false;
    }
  }

  // ---- Tokens -------------------------------------------------------------

  /** Issues a token, storing only its hash. Returns the raw token for the link. */
  private async issueToken(input: {
    purpose: 'password_reset' | 'email_verify';
    kind: 'professional' | 'customer';
    accountId: string;
    email: string;
    ttlMs: number;
  }) {
    const token = randomBytes(32).toString('base64url');
    // Any earlier unused token of the same purpose is retired, so a reset link
    // can't be resurrected after a newer one is requested.
    await this.prisma.authToken.updateMany({
      where: {
        accountId: input.accountId,
        purpose: input.purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    await this.prisma.authToken.create({
      data: {
        tokenHash: this.hash(token),
        purpose: input.purpose,
        kind: input.kind,
        accountId: input.accountId,
        email: input.email,
        expiresAt: new Date(Date.now() + input.ttlMs),
      },
    });
    return token;
  }

  /** Validates and burns a token. Returns null if invalid, expired or used. */
  async consumeToken(
    token: string,
    purpose: 'password_reset' | 'email_verify',
  ) {
    const row = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (!row || row.purpose !== purpose) return null;
    if (row.usedAt || row.expiresAt < new Date()) return null;
    await this.prisma.authToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return { kind: row.kind, accountId: row.accountId, email: row.email };
  }

  // ---- Account emails -----------------------------------------------------

  async sendPasswordReset(input: {
    kind: 'professional' | 'customer';
    accountId: string;
    email: string;
    name: string;
  }) {
    const token = await this.issueToken({
      purpose: 'password_reset',
      kind: input.kind,
      accountId: input.accountId,
      email: input.email,
      ttlMs: RESET_TTL_MIN * 60 * 1000,
    });
    const url = `${APP_URL}/reset-password?token=${token}`;
    const html = shell({
      heading: 'Reset your password',
      body:
        p(`Hi ${escapeHtml(input.name.split(' ')[0] || 'there')},`) +
        p('Click below to choose a new password. The link works once and expires in an hour.') +
        p(`If you didn't ask for this, you can ignore this email — your password won't change.`),
      cta: { label: 'Choose a new password', url },
      footnote: `Need a hand? Reply to this email or contact ${SUPPORT}.`,
    });
    return this.safeSend({
      to: input.email,
      subject: 'Reset your SelfeConnect password',
      html,
      replyTo: SUPPORT,
    });
  }

  async sendEmailVerification(input: {
    kind: 'professional' | 'customer';
    accountId: string;
    email: string;
    name: string;
  }) {
    const token = await this.issueToken({
      purpose: 'email_verify',
      kind: input.kind,
      accountId: input.accountId,
      email: input.email,
      ttlMs: VERIFY_TTL_HOURS * 60 * 60 * 1000,
    });
    const url = `${APP_URL}/verify-email?token=${token}`;
    const html = shell({
      heading: 'Confirm your email',
      body:
        p(`Hi ${escapeHtml(input.name.split(' ')[0] || 'there')},`) +
        p('Just to check we can reach you — confirm your email address below.') +
        p('You can carry on using SelfeConnect either way; this simply means we can send you job updates and help you recover your account.'),
      cta: { label: 'Confirm my email', url },
    });
    return this.safeSend({
      to: input.email,
      subject: 'Confirm your email — SelfeConnect',
      html,
      replyTo: SUPPORT,
    });
  }

  async sendProfessionalWelcome(input: {
    email: string;
    name: string;
    publicId: string;
  }) {
    const html = shell({
      heading: 'Welcome to SelfeConnect',
      body:
        p(`Hi ${escapeHtml(input.name.split(' ')[0])},`) +
        p(`Your account is set up. Your professional ID is ${strong(input.publicId)} — it's on your QR code, so customers can find you and leave a review.`) +
        p('Next: finish your subscription to unlock job contact details, and print your QR flyer from your profile.'),
      cta: { label: 'Go to my dashboard', url: `${APP_URL}/jobs` },
    });
    return this.safeSend({
      to: input.email,
      subject: 'Welcome to SelfeConnect',
      html,
      replyTo: SUPPORT,
    });
  }

  async sendCustomerWelcome(input: { email: string; name: string }) {
    const html = shell({
      heading: 'Welcome to SelfeConnect',
      body:
        p(`Hi ${escapeHtml(input.name.split(' ')[0])},`) +
        p('You can now see professionals’ contact details, post a job, and leave reviews — all free.') +
        p('Post a job and local professionals in that trade will get in touch.'),
      cta: { label: 'Find a professional', url: `${APP_URL}/customer/search` },
    });
    return this.safeSend({
      to: input.email,
      subject: 'Welcome to SelfeConnect',
      html,
      replyTo: SUPPORT,
    });
  }

  // ---- Notifications (opt-out-able) --------------------------------------

  private unsubUrl(token: string) {
    return `${APP_URL}/unsubscribe?token=${token}`;
  }

  /** "A new job in your trade, near you" — the one that makes the board work. */
  async sendNewJobAlert(input: {
    email: string;
    name: string;
    unsubscribeToken: string;
    job: {
      title: string;
      category: string;
      postcode: string;
      budget?: string | null;
      distanceMiles: number | null;
    };
  }) {
    const { job } = input;
    const where =
      job.distanceMiles != null
        ? `${job.distanceMiles} miles away (${escapeHtml(job.postcode)})`
        : escapeHtml(job.postcode);
    const html = shell({
      heading: 'New job near you',
      body:
        p(`Hi ${escapeHtml(input.name.split(' ')[0])},`) +
        p(`A customer has posted a ${strong(job.category)} job ${where}.`) +
        p(`${strong(job.title)}${job.budget ? ` — budget ${escapeHtml(job.budget)}` : ''}`) +
        p('Be quick — customers can limit how many professionals contact them.'),
      cta: { label: 'View the job', url: `${APP_URL}/jobs` },
      unsubscribeUrl: this.unsubUrl(input.unsubscribeToken),
    });
    return this.safeSend({
      to: input.email,
      subject: `New ${job.category} job near you`,
      html,
      replyTo: SUPPORT,
      unsubscribeUrl: this.unsubUrl(input.unsubscribeToken),
    });
  }

  /** Someone unlocked the customer's job — tell them to expect contact. */
  async sendInterestAlert(input: {
    email: string;
    name: string;
    unsubscribeToken: string;
    professionalName: string;
    jobTitle: string;
  }) {
    const html = shell({
      heading: 'A professional is interested',
      body:
        p(`Hi ${escapeHtml(input.name.split(' ')[0])},`) +
        p(`${strong(input.professionalName)} has your contact details for ${strong(input.jobTitle)} and may be in touch shortly.`) +
        p('You can see everyone who has responded, and mark the job as filled once you’ve chosen someone.'),
      cta: { label: 'View my jobs', url: `${APP_URL}/customer` },
      unsubscribeUrl: this.unsubUrl(input.unsubscribeToken),
    });
    return this.safeSend({
      to: input.email,
      subject: `${input.professionalName} is interested in your job`,
      html,
      replyTo: SUPPORT,
      unsubscribeUrl: this.unsubUrl(input.unsubscribeToken),
    });
  }

  /** Receipt for a tip or a direct payment. Transactional — no unsubscribe. */
  async sendPaymentReceipt(input: {
    email: string;
    professionalName: string;
    amount: number; // pence
    kind: 'tip' | 'payment';
    reference: string;
  }) {
    const amount = `£${(input.amount / 100).toFixed(2)}`;
    const noun = input.kind === 'payment' ? 'payment' : 'tip';
    const html = shell({
      heading: `Your ${noun} receipt`,
      body:
        p(`Thanks — your ${noun} of ${strong(amount)} to ${strong(input.professionalName)} went through.`) +
        p(`Reference: ${strong(input.reference)}`) +
        p(
          input.kind === 'payment'
            ? 'This payment went directly to the professional. SelfeConnect provides the payment tool only and isn’t responsible for the work or any agreement between you.'
            : '100% of your tip goes to the professional.',
        ),
      footnote: `Questions about this ${noun}? Contact ${SUPPORT}.`,
    });
    return this.safeSend({
      to: input.email,
      subject: `Receipt — ${amount} ${noun} to ${input.professionalName}`,
      html,
      replyTo: SUPPORT,
    });
  }
}
