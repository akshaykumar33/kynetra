import { SPAWN, type ServerMessage } from '@knovra/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildApp, CSRF_HEADER } from '../app';
import { loadConfig } from '../config';
import { openDatabase, type Database } from '../db/client';
import { organizations } from '../db/schema';
import { seedNorthgate } from '../db/seed';

const ORIGIN = 'http://localhost:5173';
const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'memory://',
  AUTH_DEV_LOGIN: '1',
  APP_ORIGIN: ORIGIN,
  PRESENCE_GRACE_MS: '80',
});

let database: Database;
let app: FastifyInstance;
let base: string;
let orgId: string;
let otherOrgId: string;

async function cookieFor(email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/dev/login',
    headers: { [CSRF_HEADER]: '1' },
    payload: { email },
  });
  return `knovra_sid=${res.cookies.find(c => c.name === 'knovra_sid')!.value}`;
}

/** Opens a socket and collects every message, so tests can wait for the one they expect. */
function connect(cookie: string | null, opts: { org?: string; origin?: string } = {}) {
  const ws = new WebSocket(`${base}/realtime?org=${opts.org ?? orgId}`, {
    headers: { ...(cookie ? { cookie } : {}), origin: opts.origin ?? ORIGIN },
  });
  const inbox: ServerMessage[] = [];
  ws.on('message', d => inbox.push(JSON.parse(d.toString())));
  const next = <T extends ServerMessage['t']>(
    t: T,
    match: (m: Extract<ServerMessage, { t: T }>) => boolean = () => true,
  ) =>
    new Promise<Extract<ServerMessage, { t: T }>>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`no ${t} message`)), 3000);
      const check = () => {
        const hit = inbox.find(m => m.t === t && match(m as Extract<ServerMessage, { t: T }>));
        if (hit) {
          clearTimeout(timeout);
          inbox.splice(inbox.indexOf(hit), 1);
          resolve(hit as Extract<ServerMessage, { t: T }>);
        } else setTimeout(check, 10);
      };
      check();
    });
  const send = (msg: object) => ws.send(JSON.stringify(msg));
  const refused = new Promise<number>(resolve => ws.on('unexpected-response', (_req, res) => resolve(res.statusCode!)));
  return { ws, next, send, refused, opened: new Promise(r => ws.on('open', r)) };
}

beforeAll(async () => {
  database = openDatabase('memory://');
  await database.migrate();
  orgId = await seedNorthgate(database.db);
  otherOrgId = (await database.db.insert(organizations).values({ name: 'Other', slug: 'other' }).returning())[0].id;
  app = await buildApp({ db: database.db, config });
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  base = address.replace('http', 'ws');
});

afterAll(async () => {
  await app.close();
  await database.close();
});

describe('connecting', () => {
  it('refuses anyone who is not signed in', async () => {
    expect(await connect(null).refused).toBe(401);
  });

  it('refuses connections from other websites', async () => {
    const cookie = await cookieFor('lena@northgate.test');
    expect(await connect(cookie, { origin: 'https://evil.example' }).refused).toBe(403);
  });

  it('refuses members of other organisations', async () => {
    const cookie = await cookieFor('lena@northgate.test');
    expect(await connect(cookie, { org: otherOrgId }).refused).toBe(404);
  });

  it('welcomes a member at the entrance', async () => {
    const lena = connect(await cookieFor('lena@northgate.test'));
    const welcome = await lena.next('welcome');
    const me = welcome.members.find(m => m.id === welcome.you)!;
    expect(me).toMatchObject({ x: SPAWN.x, z: SPAWN.z, status: 'available' });
    lena.ws.close();
  });
});

describe('two people on the floor', () => {
  it('shows each other’s movement, status and leaving', async () => {
    const a = connect(await cookieFor('tomas@northgate.test'));
    const aId = (await a.next('welcome')).you;
    const b = connect(await cookieFor('noah@northgate.test'));
    const welcomeB = await b.next('welcome');
    expect(welcomeB.members.map(m => m.id)).toContain(aId);
    await a.next('join', m => m.member.id === welcomeB.you);

    // A walks a step; B receives it in the next snapshot
    a.send({ t: 'move', seq: 1, x: SPAWN.x + 0.3, z: SPAWN.z - 0.2, ry: 0 });
    const snap = await b.next('snapshot', m => m.moves.some(mv => mv.id === aId));
    expect(snap.moves.find(mv => mv.id === aId)).toMatchObject({ x: SPAWN.x + 0.3, z: SPAWN.z - 0.2 });

    // A tries to teleport; the server sends A back and B never sees it
    a.send({ t: 'move', seq: 2, x: -15, z: -10, ry: 0 });
    expect(await a.next('correct')).toMatchObject({ seq: 2, x: SPAWN.x + 0.3, z: SPAWN.z - 0.2 });

    // A focuses; B is told and it is saved
    a.send({ t: 'status', status: 'focus' });
    expect(await b.next('status', m => m.id === aId)).toMatchObject({ status: 'focus' });

    // A closes the tab; after the grace period B sees A leave
    a.ws.close();
    await b.next('leave', m => m.id === aId);
    b.ws.close();
  });

  it('keeps someone on the floor if they reconnect within the grace period', async () => {
    const watcher = connect(await cookieFor('priya@northgate.test'));
    await watcher.next('welcome');
    const cookie = await cookieFor('sam@northgate.test');
    const first = connect(cookie);
    const samId = (await first.next('welcome')).you;
    first.ws.close();
    const second = connect(cookie);
    await second.next('welcome');
    await new Promise(r => setTimeout(r, 200)); // longer than the grace period
    await expect(watcher.next('leave', m => m.id === samId)).rejects.toThrow();
    second.ws.close();
    watcher.ws.close();
  });

  it('drops malformed messages without disconnecting', async () => {
    const c = connect(await cookieFor('ola@northgate.test'));
    await c.next('welcome');
    c.ws.send('not json');
    c.send({ t: 'move', seq: 1, x: 9999, z: 0, ry: 0 });
    c.send({ t: 'ping', at: 42 });
    expect(await c.next('pong')).toEqual({ t: 'pong', at: 42 });
    c.ws.close();
  });
});
