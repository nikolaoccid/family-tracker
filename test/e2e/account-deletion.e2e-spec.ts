import { DataSource } from 'typeorm';
import { around, createTestApp, register, TestApp } from '../support/app';

const count = (ds: DataSource, table: string, column: string, id: string) =>
  ds
    .query<Array<{ n: string }>>(`SELECT count(*) AS n FROM ${table} WHERE ${column} = $1`, [id])
    .then((r) => Number(r[0].n));

describe('account and family deletion', () => {
  let t: TestApp;
  let ds: DataSource;
  beforeAll(async () => {
    t = await createTestApp();
    ds = t.app.get(DataSource);
  });
  afterAll(() => t.app.close());

  it('removes locations, alerts, zone visits and the family data with the account', async () => {
    const ana = await register(t, 'leaver');
    const familyId = (await t.http().post('/family').set(ana.auth).send({ name: 'Gone' }).expect(201)).body.id;
    const zone = await t
      .http()
      .post('/safe-zone')
      .set(ana.auth)
      .send({
        name: 'Home',
        color: '#fff',
        radius: 150,
        centerLatitude: around.latitude,
        centerLongitude: around.longitude,
        membersToTrack: [ana.id],
        isActive: true,
        familyId,
      })
      .expect(201);
    const at = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
    await t
      .http()
      .post('/location')
      .set(ana.auth)
      .send({ ...around, timestamp: at(30) })
      .expect(201);
    await t
      .http()
      .post('/location')
      .set(ana.auth)
      .send({ latitude: 46.5, longitude: 16, timestamp: at(10) })
      .expect(201);
    await t.http().post('/alert/emergency').set(ana.auth).send({ familyId }).expect(201);

    expect(await count(ds, 'location_history', 'user_id', ana.id)).toBe(2);
    expect(await count(ds, 'alerts', 'user_id', ana.id)).toBeGreaterThan(0);
    expect(await count(ds, 'zone_analytics', 'user_id', ana.id)).toBe(1);

    await t.http().delete('/users/me').set(ana.auth).expect(200);

    for (const [table, column] of [
      ['location_history', 'user_id'],
      ['alerts', 'user_id'],
      ['zone_analytics', 'user_id'],
      ['safe_zones', 'family_id'],
      ['alerts', 'family_id'],
    ] as const) {
      expect(await count(ds, table, column, column === 'family_id' ? familyId : ana.id)).toBe(0);
    }
    expect(await count(ds, 'safe_zones', 'id', zone.body.id)).toBe(0);
    await t.http().get('/users/me').set(ana.auth).expect(401);
  });

  it('keeps other families untouched when one family is deleted', async () => {
    const a = await register(t, 'famA');
    const b = await register(t, 'famB');
    const fa = (await t.http().post('/family').set(a.auth).send({ name: 'A' }).expect(201)).body.id;
    const fb = (await t.http().post('/family').set(b.auth).send({ name: 'B' }).expect(201)).body.id;
    await t.http().post('/alert/emergency').set(a.auth).send({ familyId: fa }).expect(201);
    await t.http().post('/alert/emergency').set(b.auth).send({ familyId: fb }).expect(201);
    await t.http().delete(`/family/${fa}`).set(a.auth).expect(200);
    expect(await count(ds, 'alerts', 'family_id', fa)).toBe(0);
    expect(await count(ds, 'alerts', 'family_id', fb)).toBe(1);
  });
});
