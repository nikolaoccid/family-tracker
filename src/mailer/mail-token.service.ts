import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../common/config/app-config';
import { UnauthorizedError } from '../common/errors/domain-error';

const DEFAULT_TTL = '24h';

export interface FamilyInviteClaims {
  /** The invited email address (kept under the legacy `userId` claim for tokens already sent). */
  userId: string;
  familyId: string;
  /** Expiry as an ISO timestamp, from the token's own `exp` claim. */
  expiresAt?: string;
}

/** Short-lived signed tokens that travel in email deep links: account actions and family invites. */
@Injectable()
export class MailTokenService {
  constructor(private readonly config: AppConfig) {}

  sign(userId: string, expiresIn: string = DEFAULT_TTL): string {
    return this.encode({ userId }, expiresIn);
  }

  verify(token: string): { userId: string } {
    const { userId } = this.decode(token);
    if (typeof userId !== 'string') throw new UnauthorizedError('TOKEN_INVALID', 'Invalid token payload');
    return { userId };
  }

  signFamilyInvite(familyId: string, invitedEmail: string, expiresIn: string = DEFAULT_TTL): string {
    return this.encode({ userId: invitedEmail, familyId }, expiresIn);
  }

  verifyFamilyInvite(token: string): FamilyInviteClaims {
    const { userId, familyId, exp } = this.decode(token);
    if (typeof userId !== 'string' || typeof familyId !== 'string')
      throw new UnauthorizedError('TOKEN_INVALID', 'Invalid token payload');
    return { userId, familyId, expiresAt: exp ? new Date(Number(exp) * 1000).toISOString() : undefined };
  }

  private encode(claims: Record<string, string>, expiresIn: string): string {
    return jwt.sign(claims, this.config.jwtMailSecret, { expiresIn } as jwt.SignOptions);
  }

  private decode(token: string): Record<string, string | number | undefined> {
    if (!token) throw new UnauthorizedError('TOKEN_MISSING', 'Missing token');
    try {
      const payload = jwt.verify(token, this.config.jwtMailSecret);
      if (typeof payload === 'string') throw new Error('bad payload');
      return payload as Record<string, string | number | undefined>;
    } catch {
      throw new UnauthorizedError('TOKEN_INVALID', 'Invalid or expired token');
    }
  }
}
