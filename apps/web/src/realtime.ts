import { INTERP_DELAY_MS, ServerMessage, TICK_MS, type MemberState, type Status } from '@knovra/shared';
import { player, useOffice } from './state';

interface Sample {
  at: number; // local receive time
  x: number;
  z: number;
  ry: number;
}

/** Recent positions of everyone else, newest last. Read every frame by the renderer. */
export const remotes = new Map<string, Sample[]>();

let socket: WebSocket | null = null;
let sendTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;
let seq = 0;
let last = { x: NaN, z: NaN, ry: NaN };
let myId = '';
let wanted: string | null = null; // org we should be connected to

function push(id: string, s: Sample) {
  const buf = remotes.get(id) ?? [];
  buf.push(s);
  // a second of history is plenty for a 120 ms render delay
  while (buf.length > 12) buf.shift();
  remotes.set(id, buf);
}

function seed(m: MemberState) {
  remotes.set(m.id, [{ at: performance.now(), x: m.x, z: m.z, ry: m.ry }]);
}

function onMessage(raw: string) {
  let msg: ServerMessage;
  try {
    const parsed = ServerMessage.safeParse(JSON.parse(raw));
    if (!parsed.success) return;
    msg = parsed.data;
  } catch {
    return;
  }
  const st = useOffice.getState();
  switch (msg.t) {
    case 'welcome': {
      myId = msg.you;
      remotes.clear();
      const others = msg.members.filter(m => m.id !== myId);
      others.forEach(seed);
      st.setPresence(others.map(m => [m.id, m.status]));
      return;
    }
    case 'join':
      if (msg.member.id === myId) return;
      seed(msg.member);
      st.memberJoined(msg.member.id, msg.member.status);
      return;
    case 'leave':
      remotes.delete(msg.id);
      st.memberLeft(msg.id);
      return;
    case 'snapshot': {
      const now = performance.now();
      for (const m of msg.moves) if (m.id !== myId) push(m.id, { at: now, x: m.x, z: m.z, ry: m.ry });
      return;
    }
    case 'status':
      if (msg.id === myId) useOffice.setState({ myStatus: msg.status });
      else st.memberStatus(msg.id, msg.status);
      return;
    case 'correct':
      // the server refused a move: go back to the last accepted spot
      player.pos.set(msg.x, 0, msg.z);
      player.path = [];
      return;
  }
}

function sendPosition() {
  if (socket?.readyState !== WebSocket.OPEN) return;
  const { x, z } = player.pos;
  const ry = player.ry;
  if (Math.abs(x - last.x) < 0.01 && Math.abs(z - last.z) < 0.01 && Math.abs(ry - last.ry) < 0.05) return;
  last = { x, z, ry };
  socket.send(JSON.stringify({ t: 'move', seq: ++seq, x, z, ry }));
}

function open(orgId: string) {
  useOffice.getState().setConnection('connecting');
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/realtime?org=${encodeURIComponent(orgId)}`);
  socket = ws;
  ws.onopen = () => {
    retries = 0;
    last = { x: NaN, z: NaN, ry: NaN }; // resend our position after a reconnect
    useOffice.getState().setConnection('live');
  };
  ws.onmessage = e => onMessage(String(e.data));
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    useOffice.getState().setConnection('offline');
    if (wanted !== orgId) return;
    // back off 1 s, 2 s, 4 s … up to 15 s, with jitter so a server restart isn't stampeded
    const delay = Math.min(15_000, 1000 * 2 ** retries++) * (0.75 + Math.random() * 0.5);
    retryTimer = setTimeout(() => wanted === orgId && open(orgId), delay);
  };
}

export function connect(orgId: string) {
  if (wanted === orgId) return;
  disconnect();
  wanted = orgId;
  open(orgId);
  sendTimer = setInterval(sendPosition, TICK_MS);
}

export function disconnect() {
  wanted = null;
  if (sendTimer) clearInterval(sendTimer);
  if (retryTimer) clearTimeout(retryTimer);
  sendTimer = retryTimer = null;
  socket?.close();
  socket = null;
  remotes.clear();
}

/** Sends a status change live. Returns false when not connected, so the caller can use the API. */
export function sendStatus(status: Exclude<Status, 'meeting'>) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ t: 'status', status }));
  return true;
}

/**
 * Where to draw someone right now: their position INTERP_DELAY_MS ago, blended between the two
 * samples around that moment. Drawing slightly in the past hides network jitter.
 */
export function sampleAt(id: string, now: number, out: { x: number; z: number; ry: number }) {
  const buf = remotes.get(id);
  if (!buf?.length) return false;
  const t = now - INTERP_DELAY_MS;
  let i = buf.length - 1;
  while (i > 0 && buf[i - 1].at > t) i--;
  const b = buf[i];
  const a = buf[i - 1];
  if (!a || t >= b.at) {
    out.x = b.x;
    out.z = b.z;
    out.ry = b.ry;
    return true;
  }
  const k = Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at || 1)));
  out.x = a.x + (b.x - a.x) * k;
  out.z = a.z + (b.z - a.z) * k;
  const d = Math.atan2(Math.sin(b.ry - a.ry), Math.cos(b.ry - a.ry)); // shortest turn
  out.ry = a.ry + d * k;
  return true;
}
