import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { DomainError } from './domain-error';
import { CODE_BY_STATUS, ErrorBody, STATUS_BY_KIND, statusText } from './error-body';
import { mapQueryFailed } from './postgres-errors';

type Resolved = { status: number; code: string; message: string; details?: unknown };

/** The one place errors become HTTP responses. Unknown errors are logged with stack and returned without internals. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: string | number }>();
    const res = http.getResponse<Response>();
    const resolved = this.resolve(exception);
    const requestId = String(req.id ?? res.getHeader('x-request-id') ?? 'unknown');

    if (resolved.status >= 500) {
      this.logger.error({ requestId, path: req.url, err: exception }, 'Unhandled error');
    }
    const body: ErrorBody = {
      code: resolved.code,
      message: resolved.message,
      ...(resolved.details !== undefined ? { details: resolved.details } : {}),
      requestId,
      statusCode: resolved.status,
      error: statusText(resolved.status),
    };
    res.status(resolved.status).json(body);
  }

  private resolve(exception: unknown): Resolved {
    if (exception instanceof DomainError) {
      return {
        status: STATUS_BY_KIND[exception.kind],
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (exception instanceof HttpException) {
      return this.fromHttp(exception);
    }
    if (exception instanceof QueryFailedError) {
      const mapped = mapQueryFailed(exception);
      if (mapped) return mapped;
    }
    return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
  }

  private fromHttp(exception: HttpException): Resolved {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const raw = typeof payload === 'string' ? payload : (payload as { message?: unknown }).message;
    const messages = Array.isArray(raw) ? raw.map(String) : undefined;
    const code = status === 400 && messages ? 'VALIDATION_FAILED' : (CODE_BY_STATUS[status] ?? 'HTTP_ERROR');
    return {
      status,
      code,
      message: messages ? 'Validation failed' : typeof raw === 'string' ? raw : exception.message,
      details: messages,
    };
  }
}
