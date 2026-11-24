import { ErrorKind } from './domain-error';

/** Fixed error contract. statusCode/error are kept so older app builds still parse it. */
export interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
  statusCode: number;
  error: string;
}

export const STATUS_BY_KIND: Record<ErrorKind, number> = {
  not_found: 404,
  forbidden: 403,
  unauthorized: 401,
  invalid: 400,
  conflict: 409,
  unavailable: 503,
};

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function statusText(status: number): string {
  return STATUS_TEXT[status] ?? 'Error';
}

export const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  503: 'UNAVAILABLE',
};
