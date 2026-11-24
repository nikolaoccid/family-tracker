import * as jwt from 'jsonwebtoken';
import { Account, around, createTestApp, register, TestApp } from '../support/app';

const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const inside = { latitude: around.latitude + 0.0002, longitude: around.longitude };
const outside = { latitude: around.latitude + 0.02, longitude: around.longitude };

describe('locations, zones and analytics', () => {
  let t: TestApp;
  let ana: Account;
  let bob: Account;
  let familyId: string;
  let zoneId: string;

  beforeAll(async () => {
    t = await createTestApp();
    ana = await register(t, 'ana');
    bob = await register(t, 'bob');
    familyId = (await t.http().post('/family').set(ana.auth).send({ name: 'Zone family' }).expect(201)).body.id;
    await t.http().post(`/family/${familyId}/members`).set(ana.auth).send({ email: bob.email }).expect(201);
    const token = jwt.sign({ userId: bob.email, familyId }, process.env.JWT_MAIL_SECRET as string);
    await t.http().post('/family/accept').set(bob.auth).send({ inviteToken: token }).expect(201);
  });
  afterAll(() => t.app.close());

  it('creates a zone tracked for both members', async () => {
    const res = await t
      .http()
      .post('/safe-zone')
      .set(ana.auth)
      .send({
        name: 'Home',
        color: '#fff',
        radius: 150,
        ...{ centerLatitude: around.latitude, centerLongitude: around.longitude },
        membersToTrack: [ana.id, bob.id],
        isActive: true,
        familyId,
      })
      .expect(201);
    zoneId = res.body.id;
    const list = await t.http().get(`/family/${familyId}/safe-zones`).set(bob.auth).expect(200);
    expect(list.body.map((z: { id: string }) => z.id)).toContain(zoneId);
  });

  it('rejects an invalid zone', async () => {
    await t
      .http()
      .post('/safe-zone')
      .set(ana.auth)
      .send({
        name: 'Bad',
        color: '#fff',
        radius: -5,
        centerLatitude: 999,
        centerLongitude: 0,
        membersToTrack: [],
        isActive: true,
        familyId,
      })
      .expect(400);
  });

  it('keeps zones of other families away from strangers', async () => {
    const stranger = await register(t, 'stranger');
    await t.http().get(`/family/${familyId}/safe-zones`).set(stranger.auth).expect(403);
    await t.http().get(`/safe-zone/${zoneId}`).set(stranger.auth).expect(403);
    await t.http().put(`/safe-zone/${zoneId}`).set(stranger.auth).send({ name: 'Mine' }).expect(403);
  });

  it('records entry and exit, analytics and alerts for the rest of the family', async () => {
    await t
      .http()
      .post('/location')
      .set(ana.auth)
      .send({ ...outside, timestamp: at(60) })
      .expect(201);
    await t
      .http()
      .post('/location')
      .set(ana.auth)
      .send({ ...inside, timestamp: at(40) })
      .expect(201);
    await t
      .http()
      .post('/location')
      .set(ana.auth)
      .send({ ...outside, timestamp: at(10) })
      .expect(201);

    const analytics = await t.http().get(`/zone-analytics/${zoneId}/${ana.id}`).set(ana.auth).expect(200);
    expect(analytics.body).toMatchObject({ zoneName: 'Home', totalTimeSpent: 30 });
    expect(analytics.body.visits).toHaveLength(1);
    expect(analytics.body.visits[0]).toMatchObject({ duration: 30 });
    expect(analytics.body.timeByDay.reduce((sum: number, d: { minutes: number }) => sum + d.minutes, 0)).toBe(30);

    const alerts = await t.http().get(`/family/${familyId}/alerts`).set(bob.auth).expect(200);
    expect(alerts.body.map((a: { type: string }) => a.type).sort()).toEqual(['zone_entry', 'zone_exit']);
    const own = await t.http().get(`/family/${familyId}/alerts`).set(ana.auth).expect(200);
    expect(own.body).toEqual([]);
  });

  it('lets a family member read analytics, but not a stranger', async () => {
    await t.http().get(`/zone-analytics/user/${ana.id}/summary`).set(bob.auth).expect(200);
    const stranger = await register(t, 'peeker');
    await t.http().get(`/zone-analytics/user/${ana.id}/summary`).set(stranger.auth).expect(403);
  });

  it('answers 404 for a zone the user never visited', async () => {
    await t.http().get(`/zone-analytics/${zoneId}/${bob.id}`).set(bob.auth).expect(404);
  });

  it("shows a member's location only to the people they share with", async () => {
    const visible = await t.http().get(`/family/${familyId}/locations`).set(bob.auth).expect(200);
    expect(visible.body.map((m: { userId: string }) => m.userId)).toContain(ana.id);
    expect(JSON.stringify(visible.body)).not.toContain('pushTokens');
    expect(JSON.stringify(visible.body)).not.toContain('passwordHash');

    await t
      .http()
      .put('/privacy-settings')
      .set(ana.auth)
      .send({
        locationSharingEnabled: true,
        visibleTo: 'none',
        selectedMembers: [],
        schedules: [],
        notificationsEnabled: true,
        notifyLowBattery: true,
        notifyZoneEntry: true,
        notifyZoneExit: true,
      })
      .expect(200);
    await t
      .http()
      .post('/location')
      .set(ana.auth)
      .send({ ...inside, timestamp: at(1) })
      .expect(201);

    const hidden = await t.http().get(`/family/${familyId}/locations`).set(bob.auth).expect(200);
    expect(hidden.body.map((m: { userId: string }) => m.userId)).not.toContain(ana.id);
    const history = await t.http().get(`/location/history/${ana.id}`).set(bob.auth).expect(200);
    expect(
      history.body.every((p: { timestamp: string }) => new Date(p.timestamp).getTime() < Date.now() - 2 * 60_000),
    ).toBe(true);
  });

  it('pages location history with limit and cursor', async () => {
    for (let i = 0; i < 4; i++) {
      await t
        .http()
        .post('/location')
        .set(bob.auth)
        .send({ latitude: 45.7 + i * 0.01, longitude: 15.9, timestamp: at(30 - i) })
        .expect(201);
    }
    const first = await t.http().get(`/location/history/${bob.id}?limit=3`).set(bob.auth).expect(200);
    expect(first.body).toHaveLength(3);
    const cursor = first.headers['x-next-cursor'];
    expect(cursor).toBeDefined();
    const second = await t.http().get(`/location/history/${bob.id}?limit=3&cursor=${cursor}`).set(bob.auth).expect(200);
    expect(second.body).toHaveLength(1);
    expect(second.headers['x-next-cursor']).toBeUndefined();
    await t.http().get(`/location/history/${bob.id}?limit=100000`).set(bob.auth).expect(400);
    await t.http().get(`/location/history/${bob.id}?cursor=%25%25`).set(bob.auth).expect(400);
  });

  it('raises a low battery alert once per drop', async () => {
    await t.http().post('/user/battery').set(bob.auth).send({ level: 15 }).expect(201);
    await t.http().post('/user/battery').set(bob.auth).send({ level: 14 }).expect(201);
    const alerts = await t.http().get(`/family/${familyId}/alerts`).set(ana.auth).expect(200);
    expect(alerts.body.filter((a: { type: string }) => a.type === 'low_battery')).toHaveLength(1);
  });

  it("rejects a user posting emergencies into someone else's family", async () => {
    const stranger = await register(t, 'sos');
    await t.http().post('/alert/emergency').set(stranger.auth).send({ familyId }).expect(403);
    const ok = await t
      .http()
      .post('/alert/emergency')
      .set(ana.auth)
      .send({ familyId, type: 'emergency', message: 'ignored', userId: 'ignored' })
      .expect(201);
    expect(ok.body.message).toBe(`Emergency alert for ${ana.id ? 'ana' : ''}`);
  });
});
