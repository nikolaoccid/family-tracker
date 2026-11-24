/**
 * Business-rule failures. Services throw these; they carry a stable `code` and
 * know nothing about HTTP. The global filter maps `kind` to a status.
 */
export type ErrorKind = 'not_found' | 'forbidden' | 'unauthorized' | 'invalid' | 'conflict' | 'unavailable';

export class DomainError extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string) {
    super('not_found', code, message);
  }
}
export class ForbiddenError extends DomainError {
  constructor(code: string, message: string) {
    super('forbidden', code, message);
  }
}
export class UnauthorizedError extends DomainError {
  constructor(code: string, message: string) {
    super('unauthorized', code, message);
  }
}
export class InvalidError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super('invalid', code, message, details);
  }
}
export class ConflictError extends DomainError {
  constructor(code: string, message: string) {
    super('conflict', code, message);
  }
}
export class UnavailableError extends DomainError {
  constructor(code: string, message: string) {
    super('unavailable', code, message);
  }
}
