import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '../errors/domain-error';

export interface RequestWithUser {
  user?: unknown;
}

/**
 * Injects the user the auth guard attached to the request. Typed by the caller
 * (`@AuthenticatedUser() user: User`) so common/ stays free of domain types.
 */
export const AuthenticatedUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const user = context.switchToHttp().getRequest<RequestWithUser>().user;
  if (!user) throw new UnauthorizedError('UNAUTHENTICATED', 'Authentication required');
  return user;
});
