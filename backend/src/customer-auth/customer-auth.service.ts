import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';

export type PublicCustomer = {
  id: string;
  email: string;
  name: string;
  type: string;
  companyName: string | null;
  phone: string | null;
};

@Injectable()
export class CustomerAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublic(c: {
    id: string;
    email: string;
    name: string;
    type: string;
    companyName: string | null;
    phone: string | null;
  }): PublicCustomer {
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      type: c.type,
      companyName: c.companyName ?? null,
      phone: c.phone ?? null,
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
}
