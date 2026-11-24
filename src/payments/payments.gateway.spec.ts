import { Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppConfig } from '../common/config/app-config';
import { BreakerRegistry } from '../common/http/circuit-breaker';
import { PaymentsGateway } from './payments.gateway';

beforeAll(() => Logger.overrideLogger(false));

const request = { amount: 500, currency: 'eur', email: 'a@example.com' };

function gatewayWith(stripe: unknown, breakers = new BreakerRegistry({ volumeThreshold: 3, resetTimeoutMs: 100 })) {
  const gateway = new PaymentsGateway({ stripeSecretKey: 'sk_test_x' } as AppConfig, breakers);
  Object.assign(gateway, { stripe });
  return gateway;
}

describe('PaymentsGateway behind a circuit breaker', () => {
  it('stops calling Stripe after repeated outages and recovers once it answers again', async () => {
    let calls = 0;
    let healthy = false;
    const stripe = {
      customers: {
        create: jest.fn(() => {
          calls++;
          return healthy
            ? Promise.resolve({ id: 'cus_1' })
            : Promise.reject(
                new Stripe.errors.StripeConnectionError({ message: 'connection reset', type: 'api_error' }),
              );
        }),
      },
      paymentIntents: { create: jest.fn(() => Promise.resolve({ client_secret: 's' })) },
    };
    const gateway = gatewayWith(stripe);

    for (let i = 0; i < 3; i++)
      await expect(gateway.createPaymentIntent(request)).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
    const before = calls;
    await expect(gateway.createPaymentIntent(request)).rejects.toMatchObject({ code: 'UPSTREAM_CIRCUIT_OPEN' });
    expect(calls).toBe(before);

    healthy = true;
    await new Promise((r) => setTimeout(r, 150));
    await expect(gateway.createPaymentIntent(request)).resolves.toMatchObject({ customerId: 'cus_1' });
  });

  it("does not open for requests Stripe rejects (the caller's mistake)", async () => {
    const reject = Promise.reject(
      new Stripe.errors.StripeInvalidRequestError({ message: 'bad', type: 'invalid_request_error' }),
    );
    reject.catch(() => undefined);
    const stripe = { customers: { create: jest.fn(() => reject) }, paymentIntents: { create: jest.fn() } };
    const gateway = gatewayWith(stripe);
    for (let i = 0; i < 6; i++)
      await expect(gateway.createPaymentIntent(request)).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
    expect(stripe.customers.create).toHaveBeenCalledTimes(6);
  });
});
