import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app-config';
import { UnauthorizedError } from '../errors/domain-error';

export const ACCESS_TOKEN_TTL_DAYS = 30;

export interface IssuedToken {
  token: string;
  /** ISO timestamp the token stops working. */
  expiresAt: string;
}

/**
 * Signs and verifies the bearer token issued at login. Domain-free: it only knows a user id.
 * New tokens expire after 30 days. Tokens issued before expiry existed carry no `exp` claim and
 * are still accepted (jsonwebtoken only enforces `exp` when present); they leave circulation as
 * clients log in again or call POST /auth/refresh.
 */
@Injectable()
export class AccessTokenService {
  constructor(private readonly config: AppConfig) {}

  issue(userId: string): IssuedToken {
    const token = jwt.sign({ userId }, this.config.jwtSecret, { expiresIn: `${ACCESS_TOKEN_TTL_DAYS}d` });
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(exp * 1000).toISOString() };
  }

  sign(userId: string): string {
    return this.issue(userId).token;
  }

  verify(token: string | undefined): string {
    if (!token) throw new UnauthorizedError('TOKEN_MISSING', 'Missing token');
    try {
      const payload = jwt.verify(token, this.config.jwtSecret);
      if (typeof payload === 'string' || typeof payload.userId !== 'string') {
        throw new Error('bad payload');
      }
      return payload.userId;
    } catch {
      throw new UnauthorizedError('TOKEN_INVALID', 'Invalid or expired token');
    }
  }
}
