import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, CSRF_HEADER } from './app';
import { loadConfig } from './config';
import { openDatabase, type Database } from './db/client';
import { organizations } from './db/schema';
import { NEW_MEMBER_EMAIL, seedNorthgate } from './db/seed';

let database: Database;
let app: FastifyInstance;
let northgateId: string;
let otherOrgId: string;

const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: 'memory://', AUTH_DEV_LOGIN: '1' });

/** Signs in through the dev login and returns a cookie header for later requests. */
async function signIn(email: string, name = '') {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/dev/login',
    headers: { [CSRF_HEADER]: '1' },
    payload: { email, name },
  });
  expect(res.statusCode).toBe(200);
  const cookie = res.cookies.find(c => c.name === 'knovra_sid');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  return `knovra_sid=${cookie!.value}`;
}

function call(cookie: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
  return app.inject({ method, url, payload, headers: { cookie, [CSRF_HEADER]: '1' } });
}

const errorCode = (res: LightMyRequestResponse) => res.json().error.code;

beforeAll(async () => {
  database = openDatabase('memory://');
  await database.migrate();
  northgateId = await seedNorthgate(database.db);
  const [other] = await database.db.insert(organizations).values({ name: 'Other Co', slug: 'other' }).returning();
  otherOrgId = other.id;
  app = await buildApp({ db: database.db, config });
});

afterAll(async () => {
  await app.close();
  await database.close();
});

describe('basics', () => {
  it('reports health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('sets security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('requires sign-in for the API', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/me' });
    expect(res.statusCode).toBe(401);
    expect(errorCode(res)).toBe('unauthorized');
  });

  it('blocks state-changing requests without the CSRF header', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/dev/login', payload: { email: 'x@y.test' } });
    expect(res.statusCode).toBe(403);
    expect(errorCode(res)).toBe('csrf_failed');
  });

  it('blocks state-changing requests from another origin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/dev/login',
      headers: { [CSRF_HEADER]: '1', origin: 'https://evil.example' },
      payload: { email: 'x@y.test' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('never offers the dev login in production', async () => {
    const prod = loadConfig({
      NODE_ENV: 'production',
      AUTH_DEV_LOGIN: '1',
      COOKIE_SECRET: 'x'.repeat(32),
      LIVEKIT_API_KEY: 'k',
      LIVEKIT_API_SECRET: 's',
    });
    expect(prod.devLogin).toBe(false);
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/COOKIE_SECRET/);
  });
});

describe('signed-in member', () => {
  it('lists their organisations', async () => {
    const cookie = await signIn('lena@northgate.test');
    const res = await call(cookie, 'GET', '/api/v1/me');
    expect(res.statusCode).toBe(200);
    expect(res.json().orgs).toEqual([{ id: northgateId, name: 'Northgate', role: 'owner', onboarded: true }]);
  });

  it('loads the floor with everyone on it', async () => {
    const cookie = await signIn('lena@northgate.test');
    const body = (await call(cookie, 'GET', `/api/v1/orgs/${northgateId}/floor`)).json();
    expect(body.floor.name).toBe('Floor 4');
    expect(body.people).toHaveLength(12);
    expect(body.people.find((p: { name: string }) => p.name === 'Mei Lin')).toMatchObject({
      team: 'platform',
      status: 'focus',
      desk: 'platform-2',
    });
  });

  it('saves a status change', async () => {
    const cookie = await signIn('arjun@northgate.test');
    const res = await call(cookie, 'PATCH', `/api/v1/orgs/${northgateId}/me`, { status: 'focus' });
    expect(res.statusCode).toBe(200);
    const people = (await call(cookie, 'GET', `/api/v1/orgs/${northgateId}/floor`)).json().people;
    expect(people.find((p: { name: string }) => p.name === 'Arjun Nair').status).toBe('focus');
  });

  it('rejects fields a member may not set, such as their role', async () => {
    const cookie = await signIn('arjun@northgate.test');
    const res = await call(cookie, 'PATCH', `/api/v1/orgs/${northgateId}/me`, { role: 'owner' });
    expect(res.statusCode).toBe(400);
    expect(errorCode(res)).toBe('validation_failed');
  });

  it('refuses a desk someone else already has', async () => {
    const cookie = await signIn('arjun@northgate.test');
    const res = await call(cookie, 'PATCH', `/api/v1/orgs/${northgateId}/me`, { deskKey: 'design-0' });
    expect(res.statusCode).toBe(409);
  });

  it('onboards a new member once they pick a team and avatar', async () => {
    const cookie = await signIn(NEW_MEMBER_EMAIL);
    expect((await call(cookie, 'GET', '/api/v1/me')).json().orgs[0].onboarded).toBe(false);
    const res = await call(cookie, 'PATCH', `/api/v1/orgs/${northgateId}/me`, {
      teamKey: 'design',
      avatar: { body: '#2f6f8f', skin: '#d6a07a', hair: '#3a2416' },
      deskKey: 'mine',
    });
    expect(res.statusCode).toBe(200);
    expect((await call(cookie, 'GET', '/api/v1/me')).json().orgs[0].onboarded).toBe(true);
  });
});

describe('organisation isolation', () => {
  it('hides another organisation’s floor from a non-member', async () => {
    const outsider = await signIn('outsider@other.test', 'Outsider');
    const res = await call(outsider, 'GET', `/api/v1/orgs/${northgateId}/floor`);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.json())).not.toContain('Lena');
  });

  it('does not let a non-member change anything in another organisation', async () => {
    const outsider = await signIn('outsider@other.test');
    const res = await call(outsider, 'PATCH', `/api/v1/orgs/${northgateId}/me`, { status: 'away' });
    expect(res.statusCode).toBe(404);
  });

  it('does not let a Northgate member read another organisation', async () => {
    const lena = await signIn('lena@northgate.test');
    expect((await call(lena, 'GET', `/api/v1/orgs/${otherOrgId}/floor`)).statusCode).toBe(404);
  });

  it('rejects malformed organisation ids', async () => {
    const lena = await signIn('lena@northgate.test');
    expect((await call(lena, 'GET', '/api/v1/orgs/not-a-uuid/floor')).statusCode).toBe(400);
  });
});

describe('invites', () => {
  it('only lets admins and owners invite', async () => {
    const member = await signIn('tomas@northgate.test');
    const res = await call(member, 'POST', `/api/v1/orgs/${northgateId}/invites`, { email: 'new@x.test' });
    expect(res.statusCode).toBe(403);
  });

  it('lets the invited person join once, and nobody else', async () => {
    const admin = await signIn('asha@northgate.test');
    const created = await call(admin, 'POST', `/api/v1/orgs/${northgateId}/invites`, { email: 'Guest@X.test' });
    expect(created.statusCode).toBe(201);
    const token = new URL(created.json().link).searchParams.get('invite')!;

    const stranger = await signIn('stranger@x.test');
    expect((await call(stranger, 'POST', '/api/v1/invites/accept', { token })).statusCode).toBe(400);

    const guest = await signIn('guest@x.test');
    const accepted = await call(guest, 'POST', '/api/v1/invites/accept', { token });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual({ orgId: northgateId });
    expect((await call(guest, 'GET', `/api/v1/orgs/${northgateId}/floor`)).statusCode).toBe(200);

    expect((await call(guest, 'POST', '/api/v1/invites/accept', { token })).statusCode).toBe(400);
  });
});

describe('voice tokens', () => {
  const claims = (jwt: string) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());

  it('gives a member a token for their own floor only', async () => {
    const cookie = await signIn('lena@northgate.test');
    const res = await call(cookie, 'POST', `/api/v1/orgs/${northgateId}/voice-token`);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.room).toBe(`floor-${northgateId}`);
    const c = claims(body.token);
    expect(c.video).toMatchObject({ room: body.room, roomJoin: true, canPublishData: false });
    expect(c.video.canPublishSources.sort()).toEqual(['camera', 'microphone', 'screen_share']);
    const me = (await call(cookie, 'GET', '/api/v1/me')).json();
    expect(c.sub).toBe(me.user.id);
    expect(c.exp - c.nbf).toBeLessThanOrEqual(2 * 3600);
  });

  it('refuses a token for another organisation', async () => {
    const outsider = await signIn('outsider@other.test');
    expect((await call(outsider, 'POST', `/api/v1/orgs/${northgateId}/voice-token`)).statusCode).toBe(404);
  });

  it('needs the CSRF header', async () => {
    const cookie = await signIn('lena@northgate.test');
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${northgateId}/voice-token`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('requires real LiveKit keys in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', COOKIE_SECRET: 'x'.repeat(32) })).toThrow(/LIVEKIT/);
  });
});

describe('sessions', () => {
  it('signs out on the server, not just in the browser', async () => {
    const cookie = await signIn('noah@northgate.test');
    expect((await call(cookie, 'POST', '/auth/logout')).statusCode).toBe(200);
    expect((await call(cookie, 'GET', '/api/v1/me')).statusCode).toBe(401);
  });
});
