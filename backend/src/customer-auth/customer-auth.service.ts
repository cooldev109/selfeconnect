import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { MailService } from '../mail/mail.service';
import { AccountAccessService } from '../mail/account-access.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export type PublicCustomer = {
  id: string;
  email: string;
  name: string;
  type: string;
  companyName: string | null;
  phone: string | null;
  postcode: string | null;
};

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly mail: MailService,
    private readonly access: AccountAccessService,
  ) {}

  private toPublic(c: {
    id: string;
    email: string;
    name: string;
    type: string;
    companyName: string | null;
    phone: string | null;
    postcode: string | null;
  }): PublicCustomer {
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      type: c.type,
      companyName: c.companyName ?? null,
      phone: c.phone ?? null,
      postcode: c.postcode ?? null,
    };
  }

  async signup(dto: CustomerSignupDto): Promise<PublicCustomer> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) throw new ConflictException('email_taken');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const customer = await this.prisma.customer.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        phone: dto.phone?.trim(),
        type: dto.type ?? 'person',
        companyName: dto.companyName?.trim(),
      },
    });

    // Fire-and-forget: a mail failure must never fail a signup.
    void this.access.ensureUnsubscribeToken('customer', customer.id);
    void this.mail.sendCustomerWelcome({
      email: customer.email,
      name: customer.name,
    });
    void this.mail.sendEmailVerification({
      kind: 'customer',
      accountId: customer.id,
      email: customer.email,
      name: customer.name,
    });

    return this.toPublic(customer);
  }

  async login(dto: CustomerLoginDto): Promise<PublicCustomer> {
    const email = dto.email.trim().toLowerCase();
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    const hash =
      customer?.passwordHash ??
      '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(dto.password, hash);
    if (!customer || !ok) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.toPublic(customer);
  }

  async findPublicById(id: string): Promise<PublicCustomer | null> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    return customer ? this.toPublic(customer) : null;
  }

  async updateMe(id: string, dto: UpdateCustomerDto): Promise<PublicCustomer> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new UnauthorizedException('unauthenticated');

    const data: {
      name?: string;
      phone?: string;
      type?: 'person' | 'business';
      companyName?: string | null;
      postcode?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      email?: string;
      passwordHash?: string;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.companyName !== undefined)
      data.companyName = dto.companyName.trim() || null;

    if (dto.postcode !== undefined) {
      const pc = dto.postcode.trim();
      if (pc) {
        const g = await this.geo.geocode(pc);
        if (!g) throw new BadRequestException('invalid_postcode');
        data.postcode = pc;
        data.latitude = g.latitude;
        data.longitude = g.longitude;
      } else {
        data.postcode = null;
        data.latitude = null;
        data.longitude = null;
      }
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== customer.email) {
        const clash = await this.prisma.customer.findUnique({ where: { email } });
        if (clash) throw new ConflictException('email_taken');
        data.email = email;
      }
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('current_password_required');
      }
      const ok = await bcrypt.compare(
        dto.currentPassword,
        customer.passwordHash,
      );
      if (!ok) throw new BadRequestException('wrong_current_password');
      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
    });
    return this.toPublic(updated);
  }
}
