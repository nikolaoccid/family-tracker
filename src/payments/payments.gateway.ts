import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppConfig } from '../common/config/app-config';
import { UnavailableError } from '../common/errors/domain-error';
import { BreakerRegistry, UpstreamFailure } from '../common/http/circuit-breaker';

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  email: string;
}

export interface PaymentIntentResult {
  clientSecret: string | null;
  customerId: string;
}

export interface VerifiedSubscription {
  customerId: string;
  customerEmail: string | null;
  active: boolean;
  /** End of the paid period; the server's value replaces whatever the client sent. */
  currentPeriodEnd: Date;
}

const STRIPE_TIMEOUT_MS = 10_000;

/** The only code that talks to Stripe: bounded by a timeout, retried by the SDK, errors mapped to ours. */
@Injectable()
export class PaymentsGateway {
  private readonly logger = new Logger(PaymentsGateway.name);
  private readonly stripe: Stripe;

  constructor(
    config: AppConfig,
    private readonly breakers: BreakerRegistry,
  ) {
    this.stripe = new Stripe(config.stripeSecretKey, { timeout: STRIPE_TIMEOUT_MS, maxNetworkRetries: 2 });
  }

  async createPaymentIntent({ amount, currency, email }: PaymentIntentRequest): Promise<PaymentIntentResult> {
    try {
      return await this.guard(async () => {
        const customer = await this.stripe.customers.create({ email });
        const intent = await this.stripe.paymentIntents.create({
          amount,
          currency,
          customer: customer.id,
          automatic_payment_methods: { enabled: true },
        });
        return { clientSecret: intent.client_secret, customerId: customer.id };
      });
    } catch (err) {
      if (err instanceof UnavailableError) throw err;
      this.logger.error({ err }, 'Stripe payment intent failed');
      throw new UnavailableError('PAYMENT_PROVIDER_ERROR', 'Failed to create payment intent');
    }
  }

  /** Reads a subscription from Stripe; null when Stripe does not know it. */
  async retrieveSubscription(subscriptionId: string): Promise<VerifiedSubscription | null> {
    try {
      const sub = await this.guard(() => this.stripe.subscriptions.retrieve(subscriptionId, { expand: ['customer'] }));
      const customer = typeof sub.customer === 'string' ? null : sub.customer;
      const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
      return {
        customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        customerEmail: customer && !('deleted' in customer && customer.deleted) ? customer.email : null,
        active: sub.status === 'active' || sub.status === 'trialing',
        currentPeriodEnd: new Date(periodEnd * 1000),
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing') return null;
      this.logger.error({ err }, 'Stripe subscription lookup failed');
      throw new UnavailableError('PAYMENT_PROVIDER_ERROR', 'Could not verify the subscription');
    }
  }

  /** Runs a Stripe call behind the "stripe" circuit breaker; only outages (not rejected requests) count against it. */
  private guard<T>(call: () => Promise<T>): Promise<T> {
    return this.breakers.run('stripe', async () => {
      try {
        return await call();
      } catch (err) {
        if (isOutage(err)) throw new UpstreamFailure(String(err));
        throw err;
      }
    });
  }
}

function isOutage(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeConnectionError ||
    err instanceof Stripe.errors.StripeAPIError ||
    err instanceof Stripe.errors.StripeRateLimitError
  );
}
