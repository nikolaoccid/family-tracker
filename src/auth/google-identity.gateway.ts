import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AppConfig } from '../common/config/app-config';
import { UnauthorizedError, UnavailableError } from '../common/errors/domain-error';

export interface GoogleIdentity {
  /** Google's stable account id. */
  subject: string;
  email: string;
  name: string;
}

/** The only code that talks to Google: checks an ID token's signature, audience, expiry and email. */
@Injectable()
export class GoogleIdentityGateway {
  private readonly logger = new Logger(GoogleIdentityGateway.name);
  private readonly client = new OAuth2Client();

  constructor(private readonly config: AppConfig) {}

  async verify(idToken: string): Promise<GoogleIdentity> {
    const audience = this.config.googleClientIds;
    if (audience.length === 0) {
      throw new UnavailableError('GOOGLE_SIGNIN_NOT_CONFIGURED', 'Google sign-in is not configured');
    }
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) throw new Error('unverified identity');
      return { subject: payload.sub, email: payload.email, name: payload.name ?? '' };
    } catch (err) {
      this.logger.warn({ err }, 'Google token rejected');
      throw new UnauthorizedError('GOOGLE_TOKEN_INVALID', 'Invalid Google token');
    }
  }
}
