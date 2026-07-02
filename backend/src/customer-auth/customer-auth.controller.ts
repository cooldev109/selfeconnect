import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerAuthGuard, CUSTOMER_COOKIE } from './customer-auth.guard';
import { CurrentCustomer } from './current-customer.decorator';
import type { CustomerUser } from './current-customer.decorator';

const MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

@Controller('customer/auth')
export class CustomerAuthController {
  constructor(
    private readonly customers: CustomerAuthService,
    private readonly jwt: JwtService,
  ) {}

  private setCookie(res: Response, customerId: string) {
    const token = this.jwt.sign({ sub: customerId, typ: 'customer' });
    res.cookie(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
  }

  @Post('signup')
  async signup(
    @Body() dto: CustomerSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const customer = await this.customers.signup(dto);
    this.setCookie(res, customer.id);
    return { customer };
  }

  @Post('login')
  async login(
    @Body() dto: CustomerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const customer = await this.customers.login(dto);
    this.setCookie(res, customer.id);
    return { customer };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  me(@CurrentCustomer() customer: CustomerUser) {
    return { customer };
  }
}
