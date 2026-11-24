import { Injectable, Logger } from '@nestjs/common';
import { UnavailableError } from '../errors/domain-error';
import { BreakerRegistry, UpstreamFailure } from './circuit-breaker';

export interface HttpRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  /** Hard deadline per attempt. */
  timeoutMs?: number;
  /** Retries after the first attempt. Only honoured for idempotent requests. */
  retries?: number;
  /** Mark a POST as safe to repeat (for example when it carries an idempotency key). */
  idempotent?: boolean;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'DELETE']);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Backoff with full jitter: random in [0, base * 2^attempt]. */
export function backoffDelay(attempt: number, baseMs = 200, random = Math.random): number {
  return Math.floor(random() * baseMs * 2 ** attempt);
}

/**
 * The only outbound HTTP door. Typed clients (push, payments) are built on it:
 * every call has a timeout, idempotent calls retry on network errors and 5xx. HTTP error statuses are
 * returned to the caller; only transport failures (timeout, refused, reset) become an UnavailableError.
 */
@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);

  constructor(private readonly breakers: BreakerRegistry = new BreakerRegistry()) {}

  async request<T = unknown>(url: string, options: HttpRequest = {}): Promise<HttpResponse<T>> {
    const method = options.method ?? 'GET';
    const canRetry = options.idempotent ?? IDEMPOTENT_METHODS.has(method);
    const attempts = 1 + (canRetry ? (options.retries ?? 2) : 0);
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const res = await this.guarded(url, method, options);
        if (res.status >= 500 && attempt < attempts - 1) {
          lastError = new Error(`upstream status ${res.status}`);
        } else {
          return await this.toResponse<T>(res);
        }
      } catch (error) {
        if (error instanceof UnavailableError && error.code === 'UPSTREAM_CIRCUIT_OPEN') throw error;
        lastError = error;
      }
      if (attempt < attempts - 1) await wait(backoffDelay(attempt));
    }
    this.logger.warn({ url: new URL(url).host, err: lastError }, 'Outbound request failed');
    throw new UnavailableError('UPSTREAM_UNAVAILABLE', 'An upstream service is unavailable');
  }

  /** One attempt behind the host's circuit breaker; 5xx answers and transport errors count as failures. */
  private guarded(url: string, method: string, options: HttpRequest): Promise<Response> {
    return this.breakers
      .run(new URL(url).host, async () => {
        let res: Response;
        try {
          res = await this.once(url, method, options);
        } catch (error) {
          throw new UpstreamFailure(String(error));
        }
        if (res.status >= 500) {
          // Keep the response for the caller, but let the breaker see an outage.
          throw Object.assign(new UpstreamFailure(`status ${res.status}`), { response: res });
        }
        return res;
      })
      .catch((error: unknown) => {
        if (error instanceof UpstreamFailure) {
          const response = (error as UpstreamFailure & { response?: Response }).response;
          if (response) return response;
        }
        throw error;
      });
  }

  private once(url: string, method: string, options: HttpRequest): Promise<Response> {
    return fetch(url, {
      method,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  }

  private async toResponse<T>(res: Response): Promise<HttpResponse<T>> {
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Non-JSON bodies are returned as text.
    }
    return { status: res.status, data: data as T };
  }
}
