import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app-config';
import { AccessTokenService } from './access-token.service';

const make = (secret: string) => new AccessTokenService({ jwtSecret: secret } as AppConfig);

describe('AccessTokenService', () => {
  it('round-trips the user id', () => {
    const tokens = make('jwt-secret-0123456');
    expect(tokens.verify(tokens.sign('user-1'))).toBe('user-1');
  });

  it('rejects tokens from another secret and missing tokens', () => {
    expect(() => make('jwt-secret-0123456').verify(make('other-secret-0000000').sign('u'))).toThrow(
      /Invalid or expired/,
    );
    expect(() => make('jwt-secret-0123456').verify(undefined)).toThrow(/Missing token/);
  });

  it('expires new tokens after 30 days', () => {
    const tokens = make('jwt-secret-0123456');
    const { token, expiresAt } = tokens.issue('user-1');
    const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
    expect(jwt.decode(token)).toMatchObject({ userId: 'user-1', exp: expect.any(Number) });
  });

  it('still accepts tokens issued before expiry existed (no exp claim)', () => {
    const legacy = jwt.sign({ userId: 'user-1' }, 'jwt-secret-0123456');
    expect(make('jwt-secret-0123456').verify(legacy)).toBe('user-1');
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'user-1' }, 'jwt-secret-0123456', { expiresIn: -5 });
    expect(() => make('jwt-secret-0123456').verify(expired)).toThrow(/Invalid or expired/);
  });
});
