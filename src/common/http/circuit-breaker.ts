import * as CircuitBreaker from 'opossum';
import { UnavailableError } from '../errors/domain-error';

type Breaker = CircuitBreaker<[() => Promise<unknown>], unknown>;

export interface BreakerOptions {
  /** Failures in the window, as a percentage, that open the circuit. */
  errorThresholdPercentage: number;
  /** Calls needed in the window before the percentage counts. */
  volumeThreshold: number;
  /** How long the circuit stays open before one trial call is let through. */
  resetTimeoutMs: number;
  /** Length of the rolling window. */
  rollingWindowMs: number;
}

const DEFAULTS: BreakerOptions = {
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeoutMs: 15_000,
  rollingWindowMs: 30_000,
};

/** Failures that should count against the upstream (outages), as opposed to caller mistakes. */
export class UpstreamFailure extends Error {}

/**
 * One circuit breaker per upstream key (a host, or "stripe"). While open, calls fail at once with
 * UnavailableError instead of piling up behind a dead service; one trial call goes through after
 * the reset timeout. The wrapped function signals a failure by throwing; return values never trip it.
 */
export class BreakerRegistry {
  private readonly breakers = new Map<string, Breaker>();
  private readonly options: BreakerOptions;

  constructor(options: Partial<BreakerOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  async run<T>(key: string, call: () => Promise<T>): Promise<T> {
    const breaker = this.breakerFor(key);
    try {
      return (await breaker.fire(call)) as T;
    } catch (error) {
      if ((error as { code?: string }).code === 'EOPENBREAKER') {
        throw new UnavailableError('UPSTREAM_CIRCUIT_OPEN', `${key} is temporarily unavailable`);
      }
      throw error;
    }
  }

  isOpen(key: string): boolean {
    return this.breakers.get(key)?.opened ?? false;
  }

  private breakerFor(key: string): Breaker {
    let breaker = this.breakers.get(key);
    if (!breaker) {
      // The action receives the real call as its argument, so one breaker serves every call to the key.
      breaker = new CircuitBreaker((call: () => Promise<unknown>) => call(), {
        timeout: false,
        errorThresholdPercentage: this.options.errorThresholdPercentage,
        volumeThreshold: this.options.volumeThreshold,
        resetTimeout: this.options.resetTimeoutMs,
        rollingCountTimeout: this.options.rollingWindowMs,
        // Only outages count; a 4xx or a validation error is the caller's problem.
        errorFilter: (error: unknown) => !(error instanceof UpstreamFailure),
      });
      this.breakers.set(key, breaker);
    }
    return breaker;
  }
}
