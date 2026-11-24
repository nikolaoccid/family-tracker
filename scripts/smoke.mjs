#!/usr/bin/env node
// HTTP smoke test. Walks the main flows against a running API and prints one
// JSON line per step: status plus a structural "shape" of the response body.
// Used to prove runtime behaviour and to diff two builds of the API.
//
//   BASE_URL=http://localhost:3000 JWT_MAIL_SECRET=... node scripts/smoke.mjs [--seeded]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const MAIL_SECRET = process.env.JWT_MAIL_SECRET;
const seeded = process.argv.includes('--seeded');
const results = [];
let failures = 0;

function shape(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? [shape(v[0])] : [];
  if (typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, shape(v[k])]),
    );
  }
  return typeof v;
}

async function call(name, method, path, { token, body, expect } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  results.push({ name, status: res.status, shape: shape(json ?? null) });
  if (expect && res.status !== expect) {
    failures++;
    console.error(`FAIL ${name}: expected ${expect}, got ${res.status} ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

const stamp = Date.now();
const pw = 'Passw0rd!demo';
const mk = (n) => `smoke-${n}-${stamp}@example.com`;
const at = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString();

async function main() {
  await call('health', 'GET', '/health', { expect: 200 });
  await call('no token -> 401', 'GET', '/users/me', { expect: 401 });
  await call('bad login body -> 400', 'POST', '/auth/login/jwt', { body: { email: 'nope' }, expect: 400 });
  await call('wrong password -> 401', 'POST', '/auth/login/jwt', {
    body: { email: mk('a'), password: 'x' },
    expect: 401,
  });

  const reg = await call('register', 'POST', '/users', {
    body: { email: mk('a'), password: pw, name: 'Smoke A' },
    expect: 201,
  });
  const login = await call('login jwt', 'POST', '/auth/login/jwt', {
    body: { email: mk('a'), password: pw },
    expect: 201,
  });
  const token = login.json?.token ?? reg.json?.token;
  const userId = reg.json?.user?.id;
  const regB = await call('register B', 'POST', '/users', {
    body: { email: mk('b'), password: pw, name: 'Smoke B' },
    expect: 201,
  });
  const tokenB = regB.json?.token;
  await call('register existing', 'POST', '/users', { body: { email: mk('a'), password: pw }, expect: 201 });
  await call('me', 'GET', '/users/me', { token, expect: 200 });
  await call('update profile', 'PUT', '/users/profile', {
    token,
    body: { name: 'Smoke A2', phone: '123' },
    expect: 200,
  });

  const fam = await call('create family', 'POST', '/family', { token, body: { name: 'Smoke family' }, expect: 201 });
  const familyId = fam.json?.id;
  await call('get family', 'GET', `/family/${familyId}`, { token, expect: 200 });
  await call('update family', 'PUT', `/family/${familyId}`, { token, body: { name: 'Smoke family 2' }, expect: 200 });
  await call('toggle sharing', 'PUT', `/family/${familyId}/location-sharing`, {
    token,
    body: { isSharing: true },
    expect: 200,
  });
  if (MAIL_SECRET) {
    const jwt = require('jsonwebtoken');
    const invite = jwt.sign({ userId: mk('b'), familyId }, MAIL_SECRET, { expiresIn: '24h' });
    await call('invite verify', 'POST', '/family/verify', {
      token: tokenB,
      body: { inviteToken: invite },
      expect: 201,
    });
    await call('invite verify bad', 'POST', '/family/verify', {
      token: tokenB,
      body: { inviteToken: 'garbage' },
      expect: 404,
    });
  }
  await call('family validation 400', 'POST', '/family', { token, body: { name: 1, extra: true }, expect: 400 });

  await call('location', 'POST', '/location', {
    token,
    body: { latitude: 45.8131, longitude: 15.9775, timestamp: at(30), accuracy: 5 },
    expect: 201,
  });
  await call('battery', 'POST', '/user/battery', { token, body: { level: 80 }, expect: 201 });
  await call('location invalid 400', 'POST', '/location', { token, body: { latitude: 999 }, expect: 400 });

  const zone = await call('create zone', 'POST', '/safe-zone', {
    token,
    expect: 201,
    body: {
      name: 'Home',
      color: '#fff',
      radius: 150,
      centerLatitude: 45.8131,
      centerLongitude: 15.9775,
      membersToTrack: [userId],
      isActive: true,
      familyId,
    },
  });
  const zoneId = zone.json?.id;
  await call('list zones', 'GET', `/family/${familyId}/safe-zones`, { token, expect: 200 });
  await call('get zone', 'GET', `/safe-zone/${zoneId}`, { token, expect: 200 });
  await call('update zone', 'PUT', `/safe-zone/${zoneId}`, { token, body: { name: 'Home 2' }, expect: 200 });
  await call('zone status', 'PUT', `/safe-zone/${zoneId}/status`, { token, body: { isActive: true }, expect: 200 });
  await call('location inside zone', 'POST', '/location', {
    token,
    body: { latitude: 45.8131, longitude: 15.9776, timestamp: at(20) },
    expect: 201,
  });
  await call('location outside zone', 'POST', '/location', {
    token,
    body: { latitude: 45.83, longitude: 15.99, timestamp: at(10) },
    expect: 201,
  });
  await call('zone analytics', 'GET', `/zone-analytics/${zoneId}/${userId}`, { token, expect: 200 });
  await call('analytics summary', 'GET', `/zone-analytics/user/${userId}/summary`, { token, expect: 200 });
  await call('analytics visits', 'GET', `/zone-analytics/user/${userId}/visits`, { token, expect: 200 });
  await call('family locations', 'GET', `/family/${familyId}/locations`, { token, expect: 200 });
  await call('location history', 'GET', `/location/history/${userId}?limit=5`, { token, expect: 200 });
  await call('user location history', 'GET', `/user/${userId}/location-history`, { token, expect: 200 });
  await call('delete zone', 'DELETE', `/safe-zone/${zoneId}`, { token, expect: 200 });

  const sched = await call('create schedule', 'POST', '/sharing-schedules', {
    token,
    expect: 201,
    body: { name: 'Work', days: ['monday'], startTime: '08:00', endTime: '16:00', enabled: true },
  });
  await call('schedule bad time 400', 'POST', '/sharing-schedules', {
    token,
    body: { name: 'x', days: ['monday'], startTime: '8', endTime: '16:00', enabled: true },
    expect: 400,
  });
  await call('list schedules', 'GET', '/sharing-schedules', { token, expect: 200 });
  await call('get schedule', 'GET', `/sharing-schedules/${sched.json?.id}`, { token, expect: 200 });
  await call('patch schedule', 'PATCH', `/sharing-schedules/${sched.json?.id}`, {
    token,
    body: { enabled: false },
    expect: 200,
  });
  await call('delete schedule', 'DELETE', `/sharing-schedules/${sched.json?.id}`, { token, expect: 200 });

  await call('get privacy', 'GET', '/privacy-settings', { token, expect: 200 });
  await call('put privacy', 'PUT', '/privacy-settings', {
    token,
    expect: 200,
    body: {
      locationSharingEnabled: true,
      visibleTo: 'all',
      selectedMembers: [],
      notificationsEnabled: true,
      notifyLowBattery: true,
      notifyZoneEntry: true,
      notifyZoneExit: true,
      schedules: [{ name: 'Night', days: ['friday'], startTime: '22:00', endTime: '23:00', enabled: true }],
    },
  });

  const alert = await call('emergency alert', 'POST', '/alert/emergency', { token, body: { familyId }, expect: 201 });
  await call('heading home', 'POST', '/alert/heading-home', { token, body: { familyId }, expect: 201 });
  await call('family alerts', 'GET', `/family/${familyId}/alerts`, { token, expect: 200 });
  await call('delete alert', 'DELETE', `/alert/${alert.json?.id}`, { token, expect: 200 });

  await call('plans', 'GET', '/subscription/plans', { token, expect: 200 });
  await call('subscribe', 'POST', '/subscription', { token, body: { planId: 'premium' }, expect: 201 });
  await call('subscription current', 'GET', '/subscription', { token, expect: 200 });
  await call('subscribe bad plan', 'POST', '/subscription', { token, body: { planId: 'nope' }, expect: 400 });
  await call('cancel subscription', 'DELETE', '/subscription', { token, expect: 200 });
  await call('chat token', 'GET', '/chat/token', { token, expect: 200 });
  await call('push token', 'POST', '/notifications/register', {
    token,
    body: { token: 'ExponentPushToken[abc]' },
    expect: 201,
  });
  await call('delete family', 'DELETE', `/family/${familyId}`, { token, expect: 200 });
  if (seeded) await seededChecks();
}

async function seededChecks() {
  const password = process.env.DEMO_PASSWORD ?? 'DemoPass123!';
  const login = await call('seed login', 'POST', '/auth/login/jwt', {
    body: { email: 'demo.owner@example.com', password },
    expect: 201,
  });
  const token = login.json?.token;
  const uid = login.json?.user?.id;
  // Any family id resolves to the caller's own family when they are not a member of it.
  const fam = await call('seed family', 'GET', '/family/00000000-0000-4000-8000-000000000000', { token, expect: 200 });
  const familyId = fam.json?.id;
  await call('seed family locations', 'GET', `/family/${familyId}/locations`, { token, expect: 200 });
  await call('seed zones', 'GET', `/family/${familyId}/safe-zones`, { token, expect: 200 });
  await call('seed alerts', 'GET', `/family/${familyId}/alerts?limit=5`, { token, expect: 200 });
  await call('seed analytics summary', 'GET', `/zone-analytics/user/${uid}/summary`, { token, expect: 200 });
  await call('seed visits', 'GET', `/zone-analytics/user/${uid}/visits?limit=3`, { token, expect: 200 });
  await call('seed history', 'GET', `/location/history/${uid}?limit=20`, { token, expect: 200 });
  const teen = fam.json?.members?.find((m) => m.email === 'demo.teen@example.com');
  await call('seed teen history (family member)', 'GET', `/location/history/${teen?.id}?limit=5`, {
    token,
    expect: 200,
  });
  const stranger = await call('stranger login', 'POST', '/auth/login/jwt', {
    body: { email: 'demo.sara@example.com', password },
    expect: 201,
  });
  await call('stranger cannot read family history', 'GET', `/location/history/${uid}`, {
    token: stranger.json?.token,
    expect: 403,
  });
  await call('stranger cannot read zones', 'GET', `/family/${familyId}/safe-zones`, {
    token: stranger.json?.token,
    expect: 403,
  });
}

main()
  .catch((e) => {
    failures++;
    console.error('smoke crashed', e);
  })
  .finally(() => {
    for (const r of results) console.log(JSON.stringify(r));
    console.error(`${results.length} steps, ${failures} unexpected`);
    process.exit(failures ? 1 : 0);
  });
