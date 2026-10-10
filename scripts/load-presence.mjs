// Load test for live presence: N bot members join the Northgate floor and walk around.
//
//   npm run dev:server                      # API with AUTH_DEV_LOGIN=1 and SEED_ON_START=1
//   node scripts/load-presence.mjs 60 60    # 60 bots for 60 seconds
//
// Prints the server's tick time percentiles from /debug/realtime (not available in production).
import WebSocket from 'ws';

const API = process.env.KNOVRA_API ?? 'http://localhost:4000';
const ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173';
const BOTS = Number(process.argv[2] ?? 60);
const SECONDS = Number(process.argv[3] ?? 60);
const HEADERS = { 'x-knovra-csrf': '1', 'content-type': 'application/json', origin: ORIGIN };

async function post(path, body, cookie) {
  let res;
  // sign-in is rate limited per IP (30/min); wait it out rather than failing the run
  for (;;) {
    res = await fetch(API + path, {
      method: 'POST',
      headers: { ...HEADERS, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
    const wait = Number(res.headers.get('retry-after') ?? 10);
    console.log(`rate limited on ${path}, waiting ${wait}s`);
    await new Promise(r => setTimeout(r, wait * 1000));
  }
  if (!res.ok) throw new Error(`${path} ${res.status} ${await res.text()}`);
  const set = res.headers.get('set-cookie');
  return { json: await res.json(), cookie: set ? set.split(';')[0] : cookie };
}

async function get(path, cookie) {
  const res = await fetch(API + path, { headers: { cookie } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// an admin invites the bots, and each bot accepts its own invite
const admin = (await post('/auth/dev/login', { email: 'lena@northgate.test' })).cookie;
const orgId = (await get('/api/v1/me', admin)).orgs[0].id;
const bots = [];
for (let i = 0; i < BOTS; i++) {
  const email = `bot${i}@load.test`;
  const cookie = (await post('/auth/dev/login', { email, name: `Bot ${i}` })).cookie;
  const me = await get('/api/v1/me', cookie);
  if (!me.orgs.some(o => o.id === orgId)) {
    const { link } = (await post(`/api/v1/orgs/${orgId}/invites`, { email }, admin)).json;
    await post('/api/v1/invites/accept', { token: new URL(link).searchParams.get('invite') }, cookie);
  }
  bots.push(cookie);
}
console.log(`${BOTS} bots ready, walking for ${SECONDS}s`);

let received = 0;
let corrections = 0;
const sockets = bots.map(cookie => {
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/realtime?org=${orgId}`, {
    headers: { cookie, origin: ORIGIN },
  });
  // wander along the open aisle in front of the desk pods (z 4–7), turning at the walls
  let x = (Math.random() - 0.5) * 30;
  let z = 4.5 + Math.random() * 2.5;
  let dir = Math.random() < 0.5 ? -1 : 1;
  let seq = 0;
  let timer;
  ws.on('open', () => {
    timer = setInterval(() => {
      x += dir * 0.3; // 3 m/s at 10 Hz, within walking speed
      if (Math.abs(x) > 16) dir = -dir;
      ws.send(JSON.stringify({ t: 'move', seq: ++seq, x, z, ry: dir > 0 ? Math.PI / 2 : -Math.PI / 2 }));
    }, 100);
  });
  ws.on('message', d => {
    received++;
    const msg = JSON.parse(String(d));
    if (msg.t === 'correct') {
      // the server refused a jump (e.g. from the entrance straight to the aisle): resume from where it says
      corrections++;
      x = msg.x;
      z = msg.z;
    }
  });
  ws.on('close', () => clearInterval(timer));
  return ws;
});

await new Promise(r => setTimeout(r, SECONDS * 1000));
const stats = await get('/debug/realtime', admin);
for (const ws of sockets) ws.close();
console.log(
  JSON.stringify({ bots: BOTS, seconds: SECONDS, messagesReceived: received, corrections, server: stats }, null, 2),
);
