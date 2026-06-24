import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';

export const SESSION_COOKIE = 'tv_session';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('unauthenticated');

    let sub: string;
    try {
      sub = this.jwt.verify<{ sub: string }>(token).sub;
    } catch {
      throw new UnauthorizedException('unauthenticated');
    }

    const driver = await this.auth.findPublicById(sub);
    if (!driver) throw new UnauthorizedException('unauthenticated');

    (req as Request & { user: unknown }).user = driver;
    return true;
  }
}
