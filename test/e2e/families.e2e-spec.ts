import * as jwt from 'jsonwebtoken';
import { Account, createTestApp, register, TestApp } from '../support/app';

const inviteToken = (email: string, familyId: string) =>
  jwt.sign({ userId: email, familyId }, process.env.JWT_MAIL_SECRET as string, { expiresIn: '1h' });

describe('families and invites', () => {
  let t: TestApp;
  let owner: Account;
  let familyId: string;
  beforeAll(async () => {
    t = await createTestApp();
    owner = await register(t, 'owner');
    familyId = (await t.http().post('/family').set(owner.auth).send({ name: 'Test family' }).expect(201)).body.id;
  });
  afterAll(() => t.app.close());

  it('makes the creator an admin member', async () => {
    const res = await t.http().get(`/family/${familyId}`).set(owner.auth).expect(200);
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0]).toMatchObject({ role: 'admin', email: owner.email, isInvited: false });
  });

  it("shows a stranger nothing of someone else's family", async () => {
    const stranger = await register(t, 'stranger');
    await t.http().get(`/family/${familyId}`).set(stranger.auth).expect(404);
  });

  it('lets an admin invite by email, and shows the pending invite', async () => {
    const res = await t
      .http()
      .post(`/family/${familyId}/members`)
      .set(owner.auth)
      .send({ email: 'new@example.com' })
      .expect(201);
    expect(res.body.members.find((m: { isInvited: boolean }) => m.isInvited)).toMatchObject({
      email: 'new@example.com',
    });
    expect(t.mail.invites).toContainEqual({ email: 'new@example.com', familyId });
  });

  it('does not duplicate a pending invite', async () => {
    const res = await t
      .http()
      .post(`/family/${familyId}/members`)
      .set(owner.auth)
      .send({ email: 'new@example.com' })
      .expect(201);
    expect(res.body.members.filter((m: { isInvited: boolean }) => m.isInvited)).toHaveLength(1);
  });

  it('verifies and accepts an invite only for the invited address', async () => {
    const guest = await register(t, 'guest');
    await t.http().post(`/family/${familyId}/members`).set(owner.auth).send({ email: guest.email }).expect(201);
    const token = inviteToken(guest.email, familyId);

    const info = await t.http().post('/family/verify').set(guest.auth).send({ inviteToken: token }).expect(201);
    expect(info.body).toMatchObject({ familyId, familyName: 'Test family', inviteeMail: guest.email });

    const intruder = await register(t, 'intruder');
    await t.http().post('/family/accept').set(intruder.auth).send({ inviteToken: token }).expect(403);

    await t.http().post('/family/accept').set(guest.auth).send({ inviteToken: token }).expect(201);
    const family = await t.http().get(`/family/${familyId}`).set(guest.auth).expect(200);
    expect(family.body.members.map((m: { email: string }) => m.email)).toEqual(
      expect.arrayContaining([owner.email, guest.email]),
    );
  });

  it('rejects forged and unknown invites', async () => {
    const guest = await register(t, 'forged');
    await t.http().post('/family/verify').set(guest.auth).send({ inviteToken: 'garbage' }).expect(404);
    const forged = jwt.sign({ userId: guest.email, familyId }, 'not-the-secret-at-all');
    await t.http().post('/family/accept').set(guest.auth).send({ inviteToken: forged }).expect(404);
  });

  it('lets a declined invite be removed', async () => {
    const guest = await register(t, 'decline');
    await t.http().post(`/family/${familyId}/members`).set(owner.auth).send({ email: guest.email }).expect(201);
    await t
      .http()
      .post('/family/reject')
      .set(guest.auth)
      .send({ inviteToken: inviteToken(guest.email, familyId) })
      .expect(201);
    const family = await t.http().get(`/family/${familyId}`).set(owner.auth).expect(200);
    expect(family.body.members.some((m: { email: string }) => m.email === guest.email)).toBe(false);
  });

  it('keeps management to admins, lets members leave', async () => {
    const member = await register(t, 'member');
    await t.http().post(`/family/${familyId}/members`).set(owner.auth).send({ email: member.email }).expect(201);
    await t
      .http()
      .post('/family/accept')
      .set(member.auth)
      .send({ inviteToken: inviteToken(member.email, familyId) })
      .expect(201);

    await t.http().put(`/family/${familyId}`).set(member.auth).send({ name: 'Hijacked' }).expect(403);
    await t.http().post(`/family/${familyId}/members`).set(member.auth).send({ email: 'x@example.com' }).expect(403);
    await t
      .http()
      .put(`/family/${familyId}/members/${member.id}/role`)
      .set(member.auth)
      .send({ role: 'admin' })
      .expect(403);
    await t.http().delete(`/family/${familyId}/members/${owner.id}`).set(member.auth).expect(403);

    await t
      .http()
      .put(`/family/${familyId}/members/${member.id}/role`)
      .set(owner.auth)
      .send({ role: 'admin' })
      .expect(200);
    await t.http().delete(`/family/${familyId}/members/${member.id}`).set(member.auth).expect(200);
  });

  it('only lets an admin delete the family', async () => {
    const other = await register(t, 'deleter');
    const fam = (await t.http().post('/family').set(other.auth).send({ name: 'Temp' }).expect(201)).body.id;
    const stranger = await register(t, 'nodelete');
    await t.http().delete(`/family/${fam}`).set(stranger.auth).expect(403);
    await t.http().delete(`/family/${fam}`).set(other.auth).expect(200);
  });
});
