import { createHash } from 'node:crypto';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, from, mergeMap, of, throwError } from 'rxjs';
import { DataSource, LessThan, QueryFailedError } from 'typeorm';
import { ConflictError, InvalidError } from '../errors/domain-error';
import { IdempotencyKey } from './idempotency-key.entity';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 255;
const UNIQUE_VIOLATION = '23505';

/**
 * Makes a create endpoint safe to retry. The header is optional so older clients behave as before.
 * With a key: the first request runs and its response is stored for 24 hours; a repeat with the same
 * key and body gets that response back (header `Idempotent-Replayed: true`) without running again.
 * A different body under the same key is a conflict. Failed requests are not stored, so they can be retried.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id?: string } }>();
    const res = http.getResponse<Response>();
    const key = req.header(IDEMPOTENCY_HEADER);
    const userId = req.user?.id;
    if (!key || !userId) return next.handle();
    if (key.length > MAX_KEY_LENGTH) throw new InvalidError('INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key is too long');

    const repo = this.dataSource.getRepository(IdempotencyKey);
    const scope = `${req.method} ${(req.route as { path?: string } | undefined)?.path ?? req.path}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify(req.body ?? {}))
      .digest('hex');

    await repo.delete({ createdAt: LessThan(new Date(Date.now() - IDEMPOTENCY_TTL_MS)) });

    let record: IdempotencyKey;
    try {
      record = await repo.save(repo.create({ key, userId, scope, requestHash, status: null, response: null }));
    } catch (error) {
      if (!(error instanceof QueryFailedError) || (error.driverError as { code?: string }).code !== UNIQUE_VIOLATION)
        throw error;
      return this.replay(await repo.findOneByOrFail({ key, userId, scope }), requestHash, res);
    }

    return next.handle().pipe(
      mergeMap((body: unknown) =>
        from(
          repo
            .update(record.id, { status: res.statusCode, response: JSON.parse(JSON.stringify(body ?? null)) })
            .then(() => body),
        ),
      ),
      catchError((error: unknown) => from(repo.delete(record.id)).pipe(mergeMap(() => throwError(() => error)))),
    );
  }

  private replay(existing: IdempotencyKey, requestHash: string, res: Response): Observable<unknown> {
    if (existing.requestHash !== requestHash) {
      throw new ConflictError(
        'IDEMPOTENCY_KEY_REUSED',
        'This Idempotency-Key was already used with a different request',
      );
    }
    if (existing.status === null) {
      throw new ConflictError(
        'IDEMPOTENCY_IN_PROGRESS',
        'A request with this Idempotency-Key is still being processed',
      );
    }
    res.status(existing.status);
    res.setHeader('Idempotent-Replayed', 'true');
    return of(existing.response);
  }
}
