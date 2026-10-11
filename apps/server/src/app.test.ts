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
  const cookie = res.cookies.find(c => c.name === 'kynetra_sid');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  return `kynetra_sid=${cookie!.value}`;
}

function call(cookie: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) {
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

describe('campus', () => {
  it('shows every tower and marks my floor', async () => {
    const cookie = await signIn('lena@northgate.test');
    const res = await call(cookie, 'GET', `/api/v1/orgs/${northgateId}/campus`);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.buildings).toHaveLength(6);
    const tower = body.buildings.find((b: { name: string }) => b.name === 'Northgate Tower');
    expect(body.mine).toEqual({ buildingId: tower.id, level: 4 });
    expect(tower.floors.find((f: { level: number }) => f.level === 4)).toEqual({
      level: 4,
      tenant: 'Northgate',
      mine: true,
    });
    // other tenants show only their company name
    expect(Object.keys(tower.floors.find((f: { level: number }) => f.level === 2))).toEqual([
      'level',
      'tenant',
      'mine',
    ]);
  });

  it('is only for members', async () => {
    const outsider = await signIn('outsider@other.test');
    expect((await call(outsider, 'GET', `/api/v1/orgs/${northgateId}/campus`)).statusCode).toBe(404);
  });
});

describe('world', () => {
  it('shows every district and where I belong', async () => {
    const cookie = await signIn('lena@northgate.test');
    const res = await call(cookie, 'GET', '/api/v1/world');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const districts = new Set(body.buildings.map((b: { district: string }) => b.district));
    expect(districts).toEqual(new Set(['business', 'commons']));
    const [northgate] = body.you.orgs;
    expect(northgate).toMatchObject({ name: 'Northgate', team: { key: expect.any(String) } });
    const tower = body.buildings.find((b: { id: string }) => b.id === northgate.office.buildingId);
    expect(tower.name).toBe('Northgate Tower');
    expect(northgate.office.level).toBe(4);
    expect(body.homes.filter((h: { mine: boolean }) => h.mine)).toHaveLength(1);
  });

  it('gives a person with no org a home and a world to stand in', async () => {
    const cookie = await signIn('solo@nowhere.test', 'Sol Indie');
    const first = (await call(cookie, 'GET', '/api/v1/world')).json();
    expect(first.you.orgs).toEqual([]);
    const home = first.homes.find((h: { mine: boolean }) => h.mine);
    expect(home).toMatchObject({ name: "Sol's home", open: false });
    // visiting again keeps the same lot
    const again = (await call(cookie, 'GET', '/api/v1/world')).json();
    expect(again.homes.find((h: { mine: boolean }) => h.mine)).toEqual(home);
  });

  it('never gives two people the same lot', async () => {
    const cookie = await signIn('lena@northgate.test');
    const { homes } = (await call(cookie, 'GET', '/api/v1/world')).json();
    const spots = homes.map((h: { x: number; z: number }) => `${h.x},${h.z}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it('needs sign-in', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/world' })).statusCode).toBe(401);
  });
});

describe('homes', () => {
  // one small cast for every home test; the dev login is rate limited like the real one
  type Person = { cookie: string; id: string };
  let hana: Person, ravi: Person, gita: Person, nia: Person;
  async function person(email: string, name: string): Promise<Person> {
    const cookie = await signIn(email, name);
    const me = (await call(cookie, 'GET', '/api/v1/world')).json();
    return { cookie, id: me.you.userId };
  }
  beforeAll(async () => {
    hana = await person('hana@homes.test', 'Hana Ito');
    ravi = await person('ravi@homes.test', 'Ravi Shah');
    gita = await person('gita@homes.test', 'Gita Rao');
    nia = await person('nia@homes.test', 'Nia Cole');
  });

  it('lets the owner in with the default cabin, and keeps strangers out', async () => {
    const mine = await call(hana.cookie, 'GET', `/api/v1/homes/${hana.id}`);
    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toMatchObject({
      as: 'owner',
      home: { name: "Hana's home", open: false, decor: { style: 'cabin' } },
      guests: [],
    });
    const refused = await call(ravi.cookie, 'GET', `/api/v1/homes/${hana.id}`);
    expect(refused.statusCode).toBe(403);
    expect(errorCode(refused)).toBe('private_home');
  });

  it("won't take notes for a closed home you weren't invited to", async () => {
    const res = await call(ravi.cookie, 'POST', `/api/v1/homes/${hana.id}/notes`, { text: 'hello?' });
    expect(res.statusCode).toBe(403);
  });

  it('lets invited guests in, without telling the owner whether an email exists', async () => {
    const real = await call(hana.cookie, 'POST', '/api/v1/homes/mine/guests', { email: 'GITA@homes.test' });
    const ghost = await call(hana.cookie, 'POST', '/api/v1/homes/mine/guests', { email: 'nobody@homes.test' });
    expect([real.statusCode, ghost.statusCode]).toEqual([200, 200]);
    expect(real.json()).toEqual(ghost.json());

    expect((await call(gita.cookie, 'GET', `/api/v1/homes/${hana.id}`)).json()).toMatchObject({
      as: 'guest',
      guests: null,
    });
    expect((await call(gita.cookie, 'GET', '/api/v1/world')).json().you.invitedHomes).toContain(hana.id);
    expect((await call(hana.cookie, 'GET', `/api/v1/homes/${hana.id}`)).json().guests).toEqual([
      { id: gita.id, name: 'Gita Rao' },
    ]);

    await call(hana.cookie, 'DELETE', `/api/v1/homes/mine/guests/${gita.id}`);
    expect((await call(gita.cookie, 'GET', `/api/v1/homes/${hana.id}`)).statusCode).toBe(403);
  });

  it('refuses bad decor and unknown fields', async () => {
    const bad = await call(hana.cookie, 'PATCH', '/api/v1/homes/mine', {
      decor: { style: 'loft', wall: 'url(javascript:x)', items: [] },
    });
    expect(bad.statusCode).toBe(400);
    expect((await call(hana.cookie, 'PATCH', '/api/v1/homes/mine', { lot: 0 })).statusCode).toBe(400);
  });

  it('opens the door to everyone, and saves the decor visitors see', async () => {
    const decor = { style: 'neon', wall: '#1d1a33', items: ['aquarium', 'telescope'] };
    expect((await call(nia.cookie, 'PATCH', '/api/v1/homes/mine', { open: true, decor })).statusCode).toBe(200);
    const visit = (await call(ravi.cookie, 'GET', `/api/v1/homes/${nia.id}`)).json();
    expect(visit).toMatchObject({ as: 'guest', home: { open: true, decor } });
  });

  it('keeps a guestbook: visitors write, the owner tidies, and nobody floods it', async () => {
    const home = `/api/v1/homes/${nia.id}`;
    const posted = await call(ravi.cookie, 'POST', `${home}/notes`, { text: '  Lovely aquarium!  ' });
    expect(posted.statusCode).toBe(201);
    const [note] = (await call(nia.cookie, 'GET', home)).json().notes;
    expect(note).toMatchObject({ author: 'Ravi Shah', text: 'Lovely aquarium!', mine: false, canDelete: true });

    // a third person can read it but not delete it
    expect((await call(gita.cookie, 'GET', home)).json().notes[0].canDelete).toBe(false);
    expect((await call(gita.cookie, 'DELETE', `${home}/notes/${note.id}`)).statusCode).toBe(404);

    for (let i = 0; i < 4; i++) await call(ravi.cookie, 'POST', `${home}/notes`, { text: `hi ${i}` });
    expect((await call(ravi.cookie, 'POST', `${home}/notes`, { text: 'one more' })).statusCode).toBe(429);

    expect((await call(nia.cookie, 'DELETE', `${home}/notes/${note.id}`)).statusCode).toBe(200);
    const left = (await call(nia.cookie, 'GET', home)).json().notes;
    expect(left.map((n: { id: string }) => n.id)).not.toContain(note.id);
  });
});

describe('founding companies', () => {
  let founder: string;
  let rival: string;
  let tower: { id: string; name: string; levels: number; vacant: number[] };
  beforeAll(async () => {
    founder = await signIn('founder@orgs.test', 'Fay Founder');
    rival = await signIn('rival@orgs.test', 'Rex Rival');
    const { buildings } = (await call(founder, 'GET', '/api/v1/vacancies')).json();
    tower = buildings.find((b: { name: string }) => b.name === 'Helix Tower');
  });

  it('lists free floors, never the ones already leased', async () => {
    expect(tower.vacant.length).toBeGreaterThan(0);
    const world = (await call(founder, 'GET', '/api/v1/world')).json();
    const leased = world.buildings
      .find((b: { id: string }) => b.id === tower.id)
      .tenants.map((t: { level: number }) => t.level);
    for (const level of leased) expect(tower.vacant).not.toContain(level);
  });

  it('founds a company with its floor and teams, and makes you the owner', async () => {
    const level = tower.vacant[0];
    const res = await call(founder, 'POST', '/api/v1/orgs', {
      name: 'Moonbase Labs',
      buildingId: tower.id,
      level,
      teams: ['Rockets', 'Mission Control'],
    });
    expect(res.statusCode).toBe(201);
    const { orgId } = res.json();

    const me = (await call(founder, 'GET', '/api/v1/me')).json();
    expect(me.orgs).toContainEqual({ id: orgId, name: 'Moonbase Labs', role: 'owner', onboarded: false });
    const floor = (await call(founder, 'GET', `/api/v1/orgs/${orgId}/floor`)).json();
    expect(floor.floor.level).toBe(level);
    expect(floor.teams.map((t: { name: string }) => t.name).sort()).toEqual(['Mission Control', 'Rockets']);
    const teamZones = floor.layout.zones
      .filter((z: { kind: string }) => z.kind === 'team')
      .map((z: { name: string }) => z.name);
    expect(teamZones).toEqual(['Rockets', 'Mission Control', 'Open desks']);

    // the world now shows the company on that floor
    const world = (await call(rival, 'GET', '/api/v1/world')).json();
    expect(world.buildings.find((b: { id: string }) => b.id === tower.id).tenants).toContainEqual({
      level,
      orgId,
      name: 'Moonbase Labs',
    });
  });

  it('refuses a floor someone already leases', async () => {
    const taken = tower.vacant[0];
    const res = await call(rival, 'POST', '/api/v1/orgs', {
      name: 'Copycat Inc',
      buildingId: tower.id,
      level: taken,
      teams: ['Cats'],
    });
    expect(res.statusCode).toBe(409);
    // and nothing half-made is left behind
    expect((await call(rival, 'GET', '/api/v1/me')).json().orgs).toEqual([]);
  });

  it('refuses floors that do not exist and towers outside the IT park', async () => {
    const tooHigh = await call(rival, 'POST', '/api/v1/orgs', {
      name: 'Sky Co',
      buildingId: tower.id,
      level: tower.levels + 1,
      teams: ['Up'],
    });
    expect(tooHigh.statusCode).toBe(400);
    const world = (await call(rival, 'GET', '/api/v1/world')).json();
    const hall = world.buildings.find((b: { district: string }) => b.district === 'commons');
    const commons = await call(rival, 'POST', '/api/v1/orgs', {
      name: 'Town Co',
      buildingId: hall.id,
      level: 1,
      teams: ['Up'],
    });
    expect(commons.statusCode).toBe(404);
  });

  it('lets owners add and rename teams until the floor is full, and members cannot', async () => {
    const orgId = (await call(founder, 'GET', '/api/v1/me'))
      .json()
      .orgs.find((o: { name: string }) => o.name === 'Moonbase Labs').id;
    expect((await call(founder, 'POST', `/api/v1/orgs/${orgId}/teams`, { name: 'rockets' })).statusCode).toBe(409);
    expect((await call(founder, 'POST', `/api/v1/orgs/${orgId}/teams`, { name: 'Ground Crew' })).statusCode).toBe(201);
    expect((await call(founder, 'POST', `/api/v1/orgs/${orgId}/teams`, { name: 'One Too Many' })).statusCode).toBe(409);

    const manage = (await call(founder, 'GET', `/api/v1/orgs/${orgId}/manage`)).json();
    expect(manage).toMatchObject({ role: 'owner', people: 1, roomForTeams: false });
    const rockets = manage.teams.find((t: { name: string }) => t.name === 'Rockets');
    expect(rockets.people).toBe(1);
    expect(
      (await call(founder, 'PATCH', `/api/v1/orgs/${orgId}/teams/${rockets.key}`, { name: 'Launch' })).statusCode,
    ).toBe(200);
    const zones = (await call(founder, 'GET', `/api/v1/orgs/${orgId}/floor`)).json().layout.zones;
    expect(zones.map((z: { name: string }) => z.name)).toContain('Launch');

    // a non-member sees nothing; the founder's rival can't manage it
    expect((await call(rival, 'GET', `/api/v1/orgs/${orgId}/manage`)).statusCode).toBe(404);
    expect((await call(rival, 'POST', `/api/v1/orgs/${orgId}/teams`, { name: 'Sneaky' })).statusCode).toBe(404);
  });

  it('caps how many companies one person can found', async () => {
    const { buildings } = (await call(founder, 'GET', '/api/v1/vacancies')).json();
    const free = buildings.flatMap((b: { id: string; vacant: number[] }) =>
      b.vacant.map(level => ({ buildingId: b.id, level })),
    );
    const codes = [];
    for (let i = 0; i < 3; i++) {
      const res = await call(founder, 'POST', '/api/v1/orgs', { name: `Spinoff ${i}`, ...free[i], teams: ['Core'] });
      codes.push(res.statusCode);
    }
    expect(codes).toEqual([201, 201, 409]);
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
