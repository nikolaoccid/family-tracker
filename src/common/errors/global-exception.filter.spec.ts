import { ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ConflictError, ForbiddenError, NotFoundError } from './domain-error';
import { GlobalExceptionFilter } from './global-exception.filter';

beforeAll(() => Logger.overrideLogger(false));

function run(error: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: 'req-1', url: '/x' }),
      getResponse: () => ({ status, getHeader: () => undefined }),
    }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(error, host);
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as Record<string, unknown> };
}

describe('GlobalExceptionFilter', () => {
  it('maps domain errors to a status by kind and keeps the stable code', () => {
    expect(run(new NotFoundError('FAMILY_NOT_FOUND', 'Family not found'))).toMatchObject({
      status: 404,
      body: { code: 'FAMILY_NOT_FOUND', message: 'Family not found', requestId: 'req-1', statusCode: 404 },
    });
    expect(run(new ForbiddenError('X', 'no')).status).toBe(403);
    expect(run(new ConflictError('X', 'dup')).status).toBe(409);
  });

  it('puts validation messages in details', () => {
    const { status, body } = run(new BadRequestException(['name must be a string', 'age must be a number']));
    expect(status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: ['name must be a string', 'age must be a number'],
    });
  });

  it('keeps framework HTTP errors', () => {
    expect(run(new NotFoundException('gone'))).toMatchObject({
      status: 404,
      body: { code: 'NOT_FOUND', message: 'gone' },
    });
  });

  it('translates unique violations to 409', () => {
    const error = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key value'), { code: '23505' }),
    );
    expect(run(error)).toMatchObject({ status: 409, body: { code: 'ALREADY_EXISTS' } });
  });

  it('hides internals of unknown errors', () => {
    const { status, body } = run(new Error('password=hunter2 connection refused'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(body).toMatchObject({ code: 'INTERNAL_ERROR', requestId: 'req-1' });
  });
});
