import * as jwt from 'jsonwebtoken';
import { createTestApp, register, TestApp, unique } from '../support/app';

describe('accounts', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());

  it('registers, logs in and reads the profile without leaking the password hash', async () => {
    const email = `${unique('login')}@example.com`;
    const created = await t.http().post('/users').send({ email, password: 'Passw0rd!e2e', name: 'Ana' }).expect(201);
    expect(created.body.user.passwordHash).toBeUndefined();
    const login = await t.http().post('/auth/login/jwt').send({ email, password: 'Passw0rd!e2e' }).expect(201);
    const me = await t.http().get('/users/me').set('Authorization', `Bearer ${login.body.token}`).expect(200);
    expect(me.body).toMatchObject({ email, name: 'Ana', isPremium: false });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('refuses a wrong password with the same message as an unknown user', async () => {
    const a = await register(t, 'wrongpw');
    const wrong = await t.http().post('/auth/login/jwt').send({ email: a.email, password: 'nope' }).expect(401);
    const unknown = await t
      .http()
      .post('/auth/login/jwt')
      .send({ email: 'ghost@example.com', password: 'nope' })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('treats registering an existing email with the right password as a login, and refuses a wrong one', async () => {
    const a = await register(t, 'again');
    await t.http().post('/users').send({ email: a.email, password: 'Passw0rd!e2e' }).expect(201);
    await t.http().post('/users').send({ email: a.email, password: 'different' }).expect(401);
  });

  it('only updates editable profile fields', async () => {
    const a = await register(t, 'profile');
    const res = await t
      .http()
      .put('/users/profile')
      .set(a.auth)
      .send({ name: 'Renamed', isPremium: true, userRole: 'admin', email: 'other@example.com' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Renamed', isPremium: false, userRole: 'standard-user', email: a.email });
  });

  it('does not reveal whether an email has an account on password reset', async () => {
    const a = await register(t, 'reset');
    await t.http().post('/users/reset-password').send({ email: a.email }).expect(201);
    await t.http().post('/users/reset-password').send({ email: 'ghost@example.com' }).expect(201);
    expect(t.mail.resets).toEqual([a.email]);
  });

  it('rejects an invalid reset token with 400', async () => {
    await t.http().post('/users/complete-reset').send({ token: 'garbage', newPassword: 'x' }).expect(400);
  });

  it('keeps the user list to admins', async () => {
    const a = await register(t, 'notadmin');
    await t.http().get('/users').set(a.auth).expect(403);
  });

  describe('token lifetime and refresh', () => {
    const mailSecret = () => process.env.JWT_SECRET as string;

    it('issues expiring tokens at login and refreshes them', async () => {
      const a = await register(t, 'refresh');
      const res = await t.http().post('/auth/refresh').set(a.auth).expect(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
      await t.http().get('/users/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
    });

    it('keeps tokens issued without an expiry working, and lets them be refreshed', async () => {
      const a = await register(t, 'legacy');
      const legacy = jwt.sign({ userId: a.id }, mailSecret());
      await t.http().get('/users/me').set('Authorization', `Bearer ${legacy}`).expect(200);
      const res = await t.http().post('/auth/refresh').set('Authorization', `Bearer ${legacy}`).expect(201);
      expect(jwt.decode(res.body.token)).toHaveProperty('exp');
    });

    it('rejects an expired token and refuses to refresh it', async () => {
      const a = await register(t, 'expired');
      const expired = jwt.sign({ userId: a.id }, mailSecret(), { expiresIn: -60 });
      const res = await t.http().get('/users/me').set('Authorization', `Bearer ${expired}`).expect(401);
      expect(res.body.code).toBe('TOKEN_INVALID');
      await t.http().post('/auth/refresh').set('Authorization', `Bearer ${expired}`).expect(401);
      await t.http().post('/auth/refresh').expect(401);
    });
  });

  describe('Google sign-in', () => {
    beforeEach(() => t.resetRateLimits());

    it('creates an account without a usable password and rejects password login for it', async () => {
      const email = `${unique('google')}@example.com`;
      const res = await t
        .http()
        .post('/auth/google')
        .send({ idToken: `good:sub-${email}:${email}` })
        .expect(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email, name: 'Gina Google', isVerified: true });
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.googleSubject).toBeUndefined();

      await t.http().get('/users/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
      for (const password of ['', 'google', 'Passw0rd!e2e']) {
        await t
          .http()
          .post('/auth/login/jwt')
          .send({ email, password: password || 'x' })
          .expect(401);
        await t
          .http()
          .post('/users')
          .send({ email, password: password || 'x' })
          .expect(401);
      }
    });

    it('signs the same person in again and links an existing account by verified email', async () => {
      const a = await register(t, 'linked');
      const again = await t
        .http()
        .post('/auth/google')
        .send({ idToken: `good:sub-${a.email}:${a.email}` })
        .expect(201);
      expect(again.body.user.id).toBe(a.id);
      const second = await t
        .http()
        .post('/auth/google')
        .send({ idToken: `good:sub-${a.email}:${a.email}` })
        .expect(201);
      expect(second.body.user.id).toBe(a.id);
      await t.http().post('/auth/login/jwt').send({ email: a.email, password: 'Passw0rd!e2e' }).expect(201);
    });

    it('rejects an invalid token and a malformed body', async () => {
      const res = await t.http().post('/auth/google').send({ idToken: 'forged' }).expect(401);
      expect(res.body.code).toBe('GOOGLE_TOKEN_INVALID');
      await t.http().post('/auth/google').send({}).expect(400);
    });
  });
});
