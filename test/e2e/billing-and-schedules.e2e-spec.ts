import { createTestApp, fakePayments, fakeSubscriptions, register, TestApp } from '../support/app';

describe('subscriptions, payments, schedules, chat', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());

  it('moves between plans', async () => {
    const a = await register(t, 'plans');
    expect((await t.http().get('/subscription').set(a.auth).expect(200)).body.plan).toBe('free');
    await t.http().post('/subscription').set(a.auth).send({ planId: 'premium' }).expect(201);
    const current = await t.http().get('/subscription').set(a.auth).expect(200);
    expect(current.body.plan).toBe('premium');
    expect(new Date(current.body.validUntil).getTime()).toBeGreaterThan(Date.now());
    await t.http().post('/subscription').set(a.auth).send({ planId: 'gold' }).expect(400);
    await t.http().delete('/subscription').set(a.auth).expect(200);
    expect((await t.http().get('/subscription').set(a.auth)).body.plan).toBe('free');
  });

  it('creates a payment intent through the gateway and validates the amount', async () => {
    const a = await register(t, 'pay');
    const res = await t
      .http()
      .post('/payments/create-payment-intent')
      .set(a.auth)
      .send({ amount: 999, currency: 'EUR' })
      .expect(201);
    expect(res.body).toEqual({ clientSecret: 'secret_test', customerId: 'cus_test' });
    expect(fakePayments.createPaymentIntent).toHaveBeenCalledWith({ amount: 999, currency: 'eur', email: a.email });
    await t
      .http()
      .post('/payments/create-payment-intent')
      .set(a.auth)
      .send({ amount: -1, currency: 'eur' })
      .expect(400);
    await t.http().post('/payments/create-payment-intent').send({ amount: 100, currency: 'eur' }).expect(401);
  });

  describe('PUT /users/user/stripe-subscription', () => {
    const end = new Date(Date.now() + 20 * 24 * 3600 * 1000);
    const body = (sub: string, cus: string) => ({
      stripeCustomerId: cus,
      stripeSubscriptionId: sub,
      subscriptionValidUntil: '2099-01-01T00:00:00.000Z',
    });

    let bad: Awaited<ReturnType<typeof register>> | undefined;
    const badAccount = async () => (bad ??= await register(t, 'stripe-bad'));

    it("grants premium only for an active subscription Stripe confirms, and uses Stripe's period end", async () => {
      const a = await register(t, 'stripe');
      fakeSubscriptions.set('sub_ok', {
        customerId: 'cus_ok',
        customerEmail: a.email.toUpperCase(),
        active: true,
        currentPeriodEnd: end,
      });
      await t
        .http()
        .put('/users/user/stripe-subscription')
        .set(a.auth)
        .send(body('sub_ok', 'cus_ok'))
        .expect(200, { success: true });
      const current = await t.http().get('/subscription').set(a.auth).expect(200);
      expect(current.body.plan).toBe('premium');
      expect(new Date(current.body.validUntil).toISOString()).toBe(end.toISOString());
    });

    it.each([
      ['unknown subscription', 'sub_missing', 'cus_x'],
      ['inactive subscription', 'sub_inactive', 'cus_inactive'],
      ['customer mismatch', 'sub_other', 'cus_wrong'],
      ['subscription of another account', 'sub_foreign', 'cus_foreign'],
    ])('refuses %s', async (_name, sub, cus) => {
      const a = await badAccount();
      fakeSubscriptions.set('sub_inactive', {
        customerId: 'cus_inactive',
        customerEmail: a.email,
        active: false,
        currentPeriodEnd: end,
      });
      fakeSubscriptions.set('sub_other', {
        customerId: 'cus_real',
        customerEmail: a.email,
        active: true,
        currentPeriodEnd: end,
      });
      fakeSubscriptions.set('sub_foreign', {
        customerId: 'cus_foreign',
        customerEmail: 'someone.else@example.com',
        active: true,
        currentPeriodEnd: end,
      });
      const res = await t.http().put('/users/user/stripe-subscription').set(a.auth).send(body(sub, cus)).expect(400);
      expect(res.body.code).toBe('SUBSCRIPTION_NOT_VERIFIED');
      expect((await t.http().get('/subscription').set(a.auth)).body.plan).toBe('free');
    });
  });

  it('manages sharing schedules per user', async () => {
    const a = await register(t, 'sched');
    const b = await register(t, 'sched-other');
    const created = await t
      .http()
      .post('/sharing-schedules')
      .set(a.auth)
      .send({ name: 'Work', days: ['monday', 'tuesday'], startTime: '08:00', endTime: '16:00', enabled: true })
      .expect(201);
    const id = created.body.id;
    await t
      .http()
      .post('/sharing-schedules')
      .set(a.auth)
      .send({ name: 'x', days: ['funday'], startTime: '08:00', endTime: '16:00', enabled: true })
      .expect(400);
    await t.http().get(`/sharing-schedules/${id}`).set(b.auth).expect(404);
    const patched = await t.http().patch(`/sharing-schedules/${id}`).set(a.auth).send({ enabled: false }).expect(200);
    expect(patched.body).toMatchObject({ enabled: false, name: 'Work', startTime: '08:00' });
    await t.http().delete(`/sharing-schedules/${id}`).set(a.auth).expect(200);
    await t.http().delete(`/sharing-schedules/${id}`).set(a.auth).expect(200);
    expect((await t.http().get('/sharing-schedules').set(a.auth).expect(200)).body).toEqual([]);
  });

  it('stores privacy settings with their schedules', async () => {
    const a = await register(t, 'privacy');
    const dto = {
      locationSharingEnabled: true,
      visibleTo: 'selected',
      selectedMembers: [],
      notificationsEnabled: true,
      notifyLowBattery: false,
      notifyZoneEntry: true,
      notifyZoneExit: true,
      schedules: [{ name: 'Night', days: ['friday'], startTime: '22:00', endTime: '06:00', enabled: true }],
    };
    await t.http().put('/privacy-settings').set(a.auth).send(dto).expect(200);
    await t.http().put('/privacy-settings').set(a.auth).send(dto).expect(200);
    const got = await t.http().get('/privacy-settings').set(a.auth).expect(200);
    expect(got.body).toMatchObject({ visibleTo: 'selected', notifyLowBattery: false });
    expect(got.body.schedules).toHaveLength(1);
  });

  it('issues a chat token', async () => {
    const a = await register(t, 'chat');
    const res = await t.http().get('/chat/token').set(a.auth).expect(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('registers a push token without a family and ignores an empty one', async () => {
    const a = await register(t, 'push');
    await t.http().post('/notifications/register').set(a.auth).send({ token: 'ExponentPushToken[x]' }).expect(201);
    await t.http().post('/notifications/register').set(a.auth).send({ token: '' }).expect(400);
  });
});
