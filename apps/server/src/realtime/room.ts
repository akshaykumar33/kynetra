import {
  acceptMove,
  ClientMessage,
  SPAWN,
  TICK_MS,
  type MemberState,
  type ServerMessage,
  type Status,
} from '@knovra/shared';
import type { WebSocket } from 'ws';

const MAX_BUFFERED_BYTES = 1_000_000; // a client this far behind skips snapshots instead of growing memory
const MAX_MESSAGES_PER_SECOND = 40;

interface Member {
  state: MemberState;
  sockets: Set<WebSocket>;
  lastMoveAt: number;
  moved: boolean;
  leaveTimer: NodeJS.Timeout | null;
}

export interface RoomOptions {
  graceMs: number;
  /** Persists a status change the member made over the socket. */
  saveStatus: (userId: string, status: Exclude<Status, 'meeting'>) => Promise<void>;
  onEmpty: () => void;
}

/** One live floor. Holds who is here, where they stand and their status; positions are never persisted. */
export class FloorRoom {
  private members = new Map<string, Member>();
  private timer: NodeJS.Timeout | null = null;
  /** Recent tick durations in ms, for the load test. */
  readonly tickDurations: number[] = [];

  constructor(private readonly opts: RoomOptions) {}

  get size() {
    return this.members.size;
  }

  join(userId: string, status: Status, socket: WebSocket) {
    let member = this.members.get(userId);
    if (member) {
      // reconnect, or a second tab: keep their place on the floor
      if (member.leaveTimer) clearTimeout(member.leaveTimer);
      member.leaveTimer = null;
    } else {
      member = {
        state: { id: userId, x: SPAWN.x, z: SPAWN.z, ry: Math.PI, status },
        sockets: new Set(),
        lastMoveAt: Date.now(),
        moved: false,
        leaveTimer: null,
      };
      this.members.set(userId, member);
      this.broadcast({ t: 'join', member: member.state }, userId);
    }
    member.sockets.add(socket);
    this.send(socket, { t: 'welcome', you: userId, members: [...this.members.values()].map(m => m.state) });

    let windowStart = Date.now();
    let count = 0;
    socket.on('message', raw => {
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        count = 0;
      }
      if (++count > MAX_MESSAGES_PER_SECOND) return socket.close(1008, 'Too many messages');
      let parsed;
      try {
        parsed = ClientMessage.safeParse(JSON.parse(raw.toString()));
      } catch {
        return;
      }
      if (parsed.success) this.handle(userId, socket, parsed.data);
    });
    socket.on('close', () => this.disconnect(userId, socket));
    this.start();
  }

  private handle(userId: string, socket: WebSocket, msg: ClientMessage) {
    const member = this.members.get(userId);
    if (!member) return;
    switch (msg.t) {
      case 'move': {
        const now = Date.now();
        if (!acceptMove(member.state, msg, now - member.lastMoveAt)) {
          this.send(socket, { t: 'correct', seq: msg.seq, x: member.state.x, z: member.state.z });
          return;
        }
        member.state.x = msg.x;
        member.state.z = msg.z;
        member.state.ry = msg.ry;
        member.lastMoveAt = now;
        member.moved = true;
        return;
      }
      case 'status': {
        member.state.status = msg.status;
        this.broadcast({ t: 'status', id: userId, status: msg.status });
        this.opts.saveStatus(userId, msg.status).catch(() => {});
        return;
      }
      case 'ping':
        this.send(socket, { t: 'pong', at: msg.at });
    }
  }

  private disconnect(userId: string, socket: WebSocket) {
    const member = this.members.get(userId);
    if (!member) return;
    member.sockets.delete(socket);
    if (member.sockets.size > 0 || member.leaveTimer) return;
    // brief network drops shouldn't make people vanish and reappear
    member.leaveTimer = setTimeout(() => {
      this.members.delete(userId);
      this.broadcast({ t: 'leave', id: userId });
      if (this.members.size === 0) this.stop();
    }, this.opts.graceMs);
  }

  private start() {
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.opts.onEmpty();
  }

  private tick() {
    const started = performance.now();
    const moves = [];
    for (const m of this.members.values()) {
      if (!m.moved) continue;
      m.moved = false;
      moves.push({ id: m.state.id, x: m.state.x, z: m.state.z, ry: m.state.ry });
    }
    if (moves.length) this.broadcast({ t: 'snapshot', at: Date.now(), moves });
    this.tickDurations.push(performance.now() - started);
    if (this.tickDurations.length > 600) this.tickDurations.shift();
  }

  private broadcast(msg: ServerMessage, exceptUserId?: string) {
    const data = JSON.stringify(msg); // serialise once for everyone
    for (const m of this.members.values()) {
      if (m.state.id === exceptUserId) continue;
      for (const s of m.sockets) if (s.readyState === s.OPEN && s.bufferedAmount < MAX_BUFFERED_BYTES) s.send(data);
    }
  }

  private send(socket: WebSocket, msg: ServerMessage) {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
  }

  close() {
    for (const m of this.members.values()) {
      if (m.leaveTimer) clearTimeout(m.leaveTimer);
      for (const s of m.sockets) s.close(1001, 'Server shutting down');
    }
    if (this.timer) clearInterval(this.timer);
  }
}
