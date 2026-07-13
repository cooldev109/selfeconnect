import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CustomerAuthService } from './customer-auth.service';
import { CUSTOMER_COOKIE } from './customer-auth.guard';

// Never rejects. It just resolves the customer if there is a valid session, so
// a route can be public while still showing more to someone who is signed in.
// Used by the professional search + profiles: anyone may browse, but contact
// details are only attached for a signed-in customer.
@Injectable()
export class OptionalCustomerGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly customers: CustomerAuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[CUSTOMER_COOKIE];
    if (!token) return true;

    try {
      const payload = this.jwt.verify<{ sub: string; typ?: string }>(token);
      if (payload.typ === 'customer') {
        const customer = await this.customers.findPublicById(payload.sub);
        if (customer) {
          (req as Request & { customer: unknown }).customer = customer;
        }
      }
    } catch {
      // An expired or bogus cookie just means "not signed in" here.
    }
    return true;
  }
}
