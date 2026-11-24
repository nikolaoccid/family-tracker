import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC } from '../common/auth/public.decorator';
import { UnauthorizedError } from '../common/errors/domain-error';
import { AccessTokenService } from '../common/security/access-token.service';
import { UsersService } from '../users';

/** Global guard: every route needs a valid bearer token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = bearerToken(req.headers.authorization);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedError('UNAUTHENTICATED', 'Authentication required');
    }
    const user = await this.users.getById(this.tokens.verify(token));
    if (!user) throw new UnauthorizedError('TOKEN_INVALID', 'Invalid or expired token');
    req.user = user;
    return true;
  }
}

export function bearerToken(header: string | undefined): string | undefined {
  const match = header?.match(/^bearer\s+(\S+)$/i);
  return match?.[1];
}
