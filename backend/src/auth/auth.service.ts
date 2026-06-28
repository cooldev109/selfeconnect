import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { generateUniquePublicId } from '../common/public-id';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

export type PublicDriver = {
  id: string;
  publicId: string;
  name: string;
  email: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublic(d: {
    id: string;
    publicId: string;
    name: string;
    email: string;
    role: string;
  }): PublicDriver {
    return {
      id: d.id,
      publicId: d.publicId,
      name: d.name,
      email: d.email,
      role: d.role,
    };
  }

  async signup(dto: SignupDto): Promise<PublicDriver> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.driver.findUnique({ where: { email } });
    if (existing) throw new ConflictException('email_taken');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const publicId = await generateUniquePublicId(this.prisma);

    const driver = await this.prisma.driver.create({
      data: {
        email,
        passwordHash,
        publicId,
        name: dto.name.trim(),
        phone: dto.phone?.trim(),
        company: dto.company?.trim(),
      },
    });
    return this.toPublic(driver);
  }

  async login(dto: LoginDto): Promise<PublicDriver> {
    const email = dto.email.trim().toLowerCase();
    const driver = await this.prisma.driver.findUnique({ where: { email } });
    const hash =
      driver?.passwordHash ??
      '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(dto.password, hash);
    if (!driver || !ok) throw new UnauthorizedException('invalid_credentials');
    return this.toPublic(driver);
  }

  async findPublicById(id: string): Promise<PublicDriver | null> {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    return driver ? this.toPublic(driver) : null;
  }

  async changePassword(
    driverId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new UnauthorizedException('unauthenticated');
    const ok = await bcrypt.compare(currentPassword, driver.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid_current_password');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { passwordHash },
    });
  }
}
