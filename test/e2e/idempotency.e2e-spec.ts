import { DataSource } from 'typeorm';
import { around, createTestApp, register, TestApp, unique } from '../support/app';

describe('Idempotency-Key', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());

  const familyCount = async (userId: string) =>
    Number(
      (await t.app.get(DataSource).query('SELECT count(*) AS n FROM families WHERE owner_id::text = $1', [userId]))[0]
        .n,
    );

  it('creates a family once when the same request is retried with the same key', async () => {
    const a = await register(t, 'idem');
    const key = unique('key');
    const first = await t
      .http()
      .post('/family')
      .set(a.auth)
      .set('Idempotency-Key', key)
      .send({ name: 'Once' })
      .expect(201);
    const retry = await t
      .http()
      .post('/family')
      .set(a.auth)
      .set('Idempotency-Key', key)
      .send({ name: 'Once' })
      .expect(201);
    expect(retry.body).toEqual(first.body);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    expect(await familyCount(a.id)).toBe(1);
  });

  it('still creates a new resource for a new key, and works without any key', async () => {
    const a = await register(t, 'idem-new');
    await t.http().post('/family').set(a.auth).set('Idempotency-Key', unique('k1')).send({ name: 'A' }).expect(201);
    await t.http().post('/family').set(a.auth).set('Idempotency-Key', unique('k2')).send({ name: 'B' }).expect(201);
    await t.http().post('/family').set(a.auth).send({ name: 'C' }).expect(201);
    expect(await familyCount(a.id)).toBe(3);
  });

  it('refuses the same key with a different body', async () => {
    const a = await register(t, 'idem-conflict');
    const key = unique('key');
    await t.http().post('/family').set(a.auth).set('Idempotency-Key', key).send({ name: 'One' }).expect(201);
    const res = await t
      .http()
      .post('/family')
      .set(a.auth)
      .set('Idempotency-Key', key)
      .send({ name: 'Two' })
      .expect(409);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('keeps keys separate per user', async () => {
    const a = await register(t, 'idem-a');
    const b = await register(t, 'idem-b');
    const key = unique('shared');
    const fa = await t
      .http()
      .post('/family')
      .set(a.auth)
      .set('Idempotency-Key', key)
      .send({ name: 'Same' })
      .expect(201);
    const fb = await t
      .http()
      .post('/family')
      .set(b.auth)
      .set('Idempotency-Key', key)
      .send({ name: 'Same' })
      .expect(201);
    expect(fa.body.id).not.toBe(fb.body.id);
  });

  it('does not remember failed requests, so a corrected retry succeeds', async () => {
    const a = await register(t, 'idem-fail');
    const key = unique('key');
    await t.http().post('/family').set(a.auth).set('Idempotency-Key', key).send({ name: '' }).expect(400);
    await t.http().post('/family').set(a.auth).set('Idempotency-Key', key).send({ name: 'Fixed' }).expect(201);
  });

  it('forgets keys after 24 hours', async () => {
    const a = await register(t, 'idem-expiry');
    const key = unique('key');
    await t.http().post('/family').set(a.auth).set('Idempotency-Key', key).send({ name: 'Old' }).expect(201);
    await t.app
      .get(DataSource)
      .query(`UPDATE idempotency_keys SET created_at = now() - interval '25 hours' WHERE key = $1`, [key]);
    const again = await t
      .http()
      .post('/family')
      .set(a.auth)
      .set('Idempotency-Key', key)
      .send({ name: 'Old' })
      .expect(201);
    expect(again.headers['idempotent-replayed']).toBeUndefined();
    expect(await familyCount(a.id)).toBe(2);
  });

  it('protects the other create endpoints too', async () => {
    const a = await register(t, 'idem-zone');
    const familyId = (await t.http().post('/family').set(a.auth).send({ name: 'Z' }).expect(201)).body.id;
    const zone = {
      name: 'Home',
      color: '#fff',
      radius: 100,
      centerLatitude: around.latitude,
      centerLongitude: around.longitude,
      membersToTrack: [a.id],
      isActive: true,
      familyId,
    };
    const k = unique('zone');
    const z1 = await t.http().post('/safe-zone').set(a.auth).set('Idempotency-Key', k).send(zone).expect(201);
    const z2 = await t.http().post('/safe-zone').set(a.auth).set('Idempotency-Key', k).send(zone).expect(201);
    expect(z2.body.id).toBe(z1.body.id);
    expect((await t.http().get(`/family/${familyId}/safe-zones`).set(a.auth)).body).toHaveLength(1);

    const ka = unique('sos');
    const s1 = await t
      .http()
      .post('/alert/emergency')
      .set(a.auth)
      .set('Idempotency-Key', ka)
      .send({ familyId })
      .expect(201);
    const s2 = await t
      .http()
      .post('/alert/emergency')
      .set(a.auth)
      .set('Idempotency-Key', ka)
      .send({ familyId })
      .expect(201);
    expect(s2.body.id).toBe(s1.body.id);
  });
});
