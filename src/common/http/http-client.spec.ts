import { createServer, Server, ServerResponse } from 'node:http';
import { Logger } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { UnavailableError } from '../errors/domain-error';
import { BreakerRegistry } from './circuit-breaker';
import { backoffDelay, HttpClient } from './http-client';

/** A deliberately misbehaving upstream: slow, failing, or sending garbage. */
type Behaviour = (res: ServerResponse, hit: number) => void;

function fakeUpstream(behaviour: Behaviour): Promise<{ url: string; server: Server; hits: () => number }> {
  let hits = 0;
  const server = createServer((_req, res) => behaviour(res, ++hits));
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server, hits: () => hits }),
    ),
  );
}

beforeAll(() => Logger.overrideLogger(false));

const client = new HttpClient();
let upstream: Awaited<ReturnType<typeof fakeUpstream>>;
afterEach(() => new Promise<void>((done) => upstream.server.close(() => done())));

describe('HttpClient', () => {
  it('returns parsed JSON', async () => {
    upstream = await fakeUpstream((res) => res.end('{"ok":true}'));
    await expect(client.request(upstream.url)).resolves.toEqual({ status: 200, data: { ok: true } });
  });

  it('times out a slow upstream instead of hanging', async () => {
    upstream = await fakeUpstream(() => undefined);
    await expect(client.request(upstream.url, { timeoutMs: 100, retries: 0 })).rejects.toBeInstanceOf(UnavailableError);
  });

  it('retries idempotent requests on 500 and then succeeds', async () => {
    upstream = await fakeUpstream((res, hit) => {
      res.statusCode = hit < 3 ? 500 : 200;
      res.end('{"attempt":' + hit + '}');
    });
    const result = await client.request<{ attempt: number }>(upstream.url, { retries: 2 });
    expect(result.data.attempt).toBe(3);
    expect(upstream.hits()).toBe(3);
  });

  it('stops retrying after the budget and hands the last 5xx response to the caller', async () => {
    upstream = await fakeUpstream((res) => {
      res.statusCode = 500;
      res.end();
    });
    await expect(client.request(upstream.url, { retries: 1 })).resolves.toMatchObject({ status: 500 });
    expect(upstream.hits()).toBe(2);
  });

  it('never retries a plain POST', async () => {
    upstream = await fakeUpstream((res) => {
      res.statusCode = 500;
      res.end();
    });
    await expect(client.request(upstream.url, { method: 'POST', body: { a: 1 }, retries: 3 })).resolves.toMatchObject({
      status: 500,
    });
    expect(upstream.hits()).toBe(1);
  });

  it('returns a malformed body as text instead of throwing', async () => {
    upstream = await fakeUpstream((res) => res.end('<html>oops'));
    await expect(client.request(upstream.url)).resolves.toEqual({ status: 200, data: '<html>oops' });
  });

  it('reports a refused connection as unavailable', async () => {
    upstream = await fakeUpstream(() => undefined);
    const url = upstream.url;
    await new Promise<void>((done) => upstream.server.close(() => done()));
    await expect(client.request(url, { retries: 0, timeoutMs: 500 })).rejects.toBeInstanceOf(UnavailableError);
    upstream.server.listen(0); // keep afterEach happy
  });
});

describe('HttpClient circuit breaker', () => {
  const breakers = () => new BreakerRegistry({ volumeThreshold: 3, resetTimeoutMs: 150 });

  it('fails fast while an upstream keeps failing, then recovers', async () => {
    let healthy = false;
    upstream = await fakeUpstream((res) => {
      res.statusCode = healthy ? 200 : 503;
      res.end('{}');
    });
    const guarded = new HttpClient(breakers());
    for (let i = 0; i < 3; i++) await guarded.request(upstream.url, { method: 'POST', body: {} });
    const hits = upstream.hits();

    await expect(guarded.request(upstream.url, { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'UPSTREAM_CIRCUIT_OPEN',
    });
    expect(upstream.hits()).toBe(hits);

    healthy = true;
    await new Promise((r) => setTimeout(r, 200));
    await expect(guarded.request(upstream.url, { method: 'POST', body: {} })).resolves.toMatchObject({ status: 200 });
  });

  it('is not tripped by 4xx answers', async () => {
    upstream = await fakeUpstream((res) => {
      res.statusCode = 404;
      res.end();
    });
    const guarded = new HttpClient(breakers());
    for (let i = 0; i < 8; i++) await expect(guarded.request(upstream.url)).resolves.toMatchObject({ status: 404 });
    expect(upstream.hits()).toBe(8);
  });

  it('opens after timeouts too, so slow upstreams stop tying up requests', async () => {
    upstream = await fakeUpstream(() => undefined);
    const guarded = new HttpClient(breakers());
    for (let i = 0; i < 3; i++)
      await expect(guarded.request(upstream.url, { timeoutMs: 50, retries: 0 })).rejects.toBeInstanceOf(
        UnavailableError,
      );
    const started = Date.now();
    await expect(guarded.request(upstream.url, { timeoutMs: 2000, retries: 0 })).rejects.toMatchObject({
      code: 'UPSTREAM_CIRCUIT_OPEN',
    });
    expect(Date.now() - started).toBeLessThan(200);
  });
});

describe('backoffDelay', () => {
  it('grows with the attempt and is jittered within bounds', () => {
    expect(backoffDelay(0, 200, () => 1)).toBe(200);
    expect(backoffDelay(2, 200, () => 1)).toBe(800);
    expect(backoffDelay(2, 200, () => 0)).toBe(0);
  });
});
