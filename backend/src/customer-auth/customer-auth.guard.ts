import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CustomerAuthService } from './customer-auth.service';

// Separate cookie from the professional session so the two account types can
// even be logged in side by side without clashing.
export const CUSTOMER_COOKIE = 'sc_customer';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly customers: CustomerAuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[CUSTOMER_COOKIE];
    if (!token) throw new UnauthorizedException('unauthenticated');

    let payload: { sub: string; typ?: string };
    try {
      payload = this.jwt.verify<{ sub: string; typ?: string }>(token);
    } catch {
      throw new UnauthorizedException('unauthenticated');
    }
    if (payload.typ !== 'customer') {
      throw new UnauthorizedException('unauthenticated');
    }

    const customer = await this.customers.findPublicById(payload.sub);
    if (!customer) throw new UnauthorizedException('unauthenticated');

    (req as Request & { customer: unknown }).customer = customer;
    return true;
  }
}
