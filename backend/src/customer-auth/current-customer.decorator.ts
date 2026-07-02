import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  type: string;
  companyName: string | null;
  phone: string | null;
}

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerUser => {
    return ctx.switchToHttp().getRequest().customer;
  },
);
