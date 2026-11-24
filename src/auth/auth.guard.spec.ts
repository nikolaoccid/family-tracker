import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../common/auth/public.decorator';
import { AccessTokenService } from '../common/security/access-token.service';
import { AppConfig } from '../common/config/app-config';
import { UsersService } from '../users';
import { AuthGuard, bearerToken } from './auth.guard';

class Controller {
  @Public() open(): void {}
  closed(): void {}
}

const tokens = new AccessTokenService({ jwtSecret: 'jwt-secret-0123456' } as AppConfig);
const user = { id: 'u1', name: 'Ana' };
const users = {
  getById: jest.fn((id: string) => Promise.resolve(id === 'u1' ? user : null)),
} as unknown as UsersService;
const guard = new AuthGuard(new Reflector(), tokens, users);

function context(handler: () => void, authorization?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown } = { headers: { authorization } };
  const ctx = {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('bearerToken', () => {
  it('extracts the token case-insensitively', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('bearer abc')).toBe('abc');
    expect(bearerToken('Basic abc')).toBeUndefined();
    expect(bearerToken(undefined)).toBeUndefined();
  });
});

describe('AuthGuard', () => {
  it('rejects a protected route without a token', async () => {
    await expect(guard.canActivate(context(Controller.prototype.closed).ctx)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('lets a public route through without a token', async () => {
    await expect(guard.canActivate(context(Controller.prototype.open).ctx)).resolves.toBe(true);
  });

  it('attaches the user for a valid token', async () => {
    const { ctx, req } = context(Controller.prototype.closed, `Bearer ${tokens.sign('u1')}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBe(user);
  });

  it('rejects a valid token for a user that no longer exists', async () => {
    await expect(
      guard.canActivate(context(Controller.prototype.closed, `Bearer ${tokens.sign('gone')}`).ctx),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
  });

  it('rejects a bad token', async () => {
    await expect(guard.canActivate(context(Controller.prototype.closed, 'Bearer nope').ctx)).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
    });
  });
});
