import { INestApplication } from '@nestjs/common';
import { Readiness } from '../../src/health/readiness';
import { createTestApp, register, TestApp } from '../support/app';

describe('platform behaviour', () => {
  let t: TestApp;
  let app: INestApplication;
  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
  });
  afterAll(() => app.close());

  it('serves the legacy health route and live/ready probes without a token', async () => {
    await t.http().get('/health').expect(200, { status: 'ok' });
    await t.http().get('/health/live').expect(200);
    const ready = await t.http().get('/health/ready').expect(200);
    expect(ready.body.info.database.status).toBe('up');
  });

  it('reports not ready once shutdown has started', async () => {
    const readiness = app.get(Readiness);
    readiness.beforeApplicationShutdown();
    await t.http().get('/health/ready').expect(503);
    await t.http().get('/health/live').expect(200);
    Object.assign(readiness, { shuttingDown: false });
  });

  it('answers 401 with the standard error body when no token is sent', async () => {
    const res = await t.http().get('/users/me').expect(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHENTICATED', statusCode: 401, error: 'Unauthorized' });
    expect(res.body.requestId).toEqual(expect.any(String));
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('echoes a caller-supplied request id', async () => {
    const res = await t.http().get('/users/me').set('X-Request-Id', 'trace-123').expect(401);
    expect(res.body.requestId).toBe('trace-123');
  });

  it('rejects an invalid body with details and unknown fields', async () => {
    const res = await t
      .http()
      .post('/auth/login/jwt')
      .send({ email: 'not-an-email', password: 'x', extra: 1 })
      .expect(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED', message: 'Validation failed' });
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.stringContaining('email'), expect.stringContaining('extra')]),
    );
  });

  it('sets security headers and honours the CORS allow-list', async () => {
    const allowed = await t.http().get('/health').set('Origin', 'https://app.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    const other = await t.http().get('/health').set('Origin', 'https://evil.example.com');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('throttles repeated login attempts', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 15; i++) {
      statuses.push(
        (await t.http().post('/auth/login/jwt').send({ email: 'nobody@example.com', password: 'wrong' })).status,
      );
    }
    const firstLimited = statuses.indexOf(429);
    expect(firstLimited).toBeGreaterThan(5);
    expect(firstLimited).toBeLessThanOrEqual(10);
    expect(statuses.slice(0, firstLimited).every((s) => s === 401)).toBe(true);
  });

  it('turns a malformed uuid into a 400, not a database error', async () => {
    const me = await register(t, 'uuid');
    const res = await t.http().get('/family/not-a-uuid').set(me.auth).expect(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});
