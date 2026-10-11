import { findPath, SPAWN, type KnockState, type Person, type Status } from '@knovra/shared';
import { Vector3 } from 'three';
import { create } from 'zustand';
import { api, type FloorData } from './api';
import { remotes, sendStatus } from './realtime';

// Per-frame positions live outside React so movement never re-renders the tree.
export const positions = new Map<string, Vector3>();
export const player = {
  pos: new Vector3(SPAWN.x, 0, SPAWN.z),
  /** Waypoints still to walk, nearest first. Empty when standing or steering by keyboard. */
  path: [] as Vector3[],
  /** Facing, in radians around the vertical axis. */
  ry: Math.PI,
};

/** ?demo=1 fills the floor with simulated colleagues instead of live presence. */
export const DEMO = new URLSearchParams(location.search).has('demo');

/** Someone we are walking over to; their position is re-checked as they move (see followTick). */
let following: string | null = null;
let lastRoute = 0;

/** Walks over to a colleague and keeps adjusting the route if they move, until we're beside them. */
export function walkToPerson(id: string) {
  following = id;
  lastRoute = 0;
  followTick(performance.now());
}

/** Called every frame by the player. Stops when close, when they leave, or when keys take over. */
export function followTick(now: number, steering = false) {
  if (!following) return;
  const pos = positions.get(following);
  if (steering || !pos) {
    following = null;
    return;
  }
  const d = Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z);
  if (d < 1.6) {
    following = null;
    player.path = [];
    return;
  }
  if (now - lastRoute < 500) return; // re-plan twice a second at most
  lastRoute = now;
  // stand 1.3 m from them, on our side
  const k = 1.3 / Math.max(d, 0.01);
  walkTo(pos.x + (player.pos.x - pos.x) * k, pos.z + (player.pos.z - pos.z) * k);
}

/** Walks the player to a spot, routing around furniture. Returns false when there is no route. */
export function walkTo(x: number, z: number): boolean {
  const route = findPath(player.pos, { x, z }, useOffice.getState().knock === 'admitted');
  player.path = route.map(p => new Vector3(p.x, 0, p.z));
  return route.length > 0;
}

interface Toast {
  id: number;
  text: string;
}

export interface VoiceState {
  state: 'off' | 'joining' | 'on' | 'reconnecting';
  error: string | null;
  /** People whose audio we receive right now (from the proximity rules). */
  hearing: string[];
  /** People talking right now, including me. */
  speaking: string[];
  muted: boolean;
  pushToTalk: boolean;
  camera: boolean;
  sharing: boolean;
  devices: { id: string; label: string }[];
  deviceId: string | null;
  /** Bumped when remote video tracks come or go. */
  tracksVersion: number;
}

interface OfficeState {
  voice: VoiceState;
  orgId: string;
  orgName: string;
  floorName: string;
  me: Person | null;
  /** Everyone on the floor except me. */
  people: Person[];
  myStatus: Status;
  statuses: Record<string, Status>;
  nearby: string[]; // colleagues inside voice range
  zoneId: string | null; // zone the player stands in
  knock: KnockState;
  insideRoom: boolean;
  toasts: Toast[];
  /** Ids of colleagues connected to the floor right now. */
  online: Record<string, true>;
  connection: 'connecting' | 'live' | 'offline';
  /** Bumped when someone unknown joins, so the people list is refetched. */
  peopleVersion: number;
  setConnection: (c: OfficeState['connection']) => void;
  setPresence: (members: [string, Status][]) => void;
  memberJoined: (id: string, status: Status) => void;
  memberLeft: (id: string) => void;
  memberStatus: (id: string, status: Status) => void;
  loadFloor: (data: FloorData) => void;
  setMyStatus: (s: Exclude<Status, 'meeting'>) => Promise<void>;
  setNearby: (ids: string[]) => void;
  setZone: (id: string | null) => void;
  setKnock: (k: KnockState) => void;
  setInsideRoom: (v: boolean) => void;
  toast: (text: string) => void;
}

let toastId = 0;

export const useOffice = create<OfficeState>((set, get) => ({
  voice: {
    state: 'off',
    error: null,
    hearing: [],
    speaking: [],
    muted: false,
    pushToTalk: false,
    camera: false,
    sharing: false,
    devices: [],
    deviceId: null,
    tracksVersion: 0,
  },
  orgId: '',
  orgName: '',
  floorName: '',
  me: null,
  people: [],
  myStatus: 'available',
  statuses: {},
  nearby: [],
  zoneId: null,
  knock: 'none',
  insideRoom: false,
  toasts: [],
  online: {},
  connection: 'connecting',
  peopleVersion: 0,
  setConnection: connection => get().connection !== connection && set({ connection }),
  setPresence: members =>
    set(s => ({
      online: Object.fromEntries(members.map(([id]) => [id, true as const])),
      statuses: { ...s.statuses, ...Object.fromEntries(members) },
    })),
  memberJoined: (id, status) =>
    set(s => ({
      online: { ...s.online, [id]: true },
      statuses: { ...s.statuses, [id]: status },
      peopleVersion: s.people.some(p => p.id === id) ? s.peopleVersion : s.peopleVersion + 1,
    })),
  memberLeft: id =>
    set(s => {
      const online = { ...s.online };
      delete online[id];
      return { online };
    }),
  memberStatus: (id, status) => set(s => ({ statuses: { ...s.statuses, [id]: status } })),
  loadFloor: data => {
    const me = data.people.find(p => p.id === data.meId) ?? null;
    const people = data.people.filter(p => p.id !== data.meId);
    set({
      orgId: data.org.id,
      orgName: data.org.name,
      floorName: data.floor.name,
      me,
      people,
      myStatus: me?.status ?? 'available',
      statuses: Object.fromEntries(people.map(p => [p.id, p.status])),
    });
  },
  setMyStatus: async myStatus => {
    const previous = get().myStatus;
    set({ myStatus }); // optimistic: the switch responds instantly
    if (sendStatus(myStatus)) return; // live: the server saves it and tells everyone
    try {
      await api.updateMe(get().orgId, { status: myStatus });
    } catch {
      set({ myStatus: previous });
      get().toast("Couldn't save your status. Check your connection and try again.");
    }
  },
  setNearby: nearby => {
    const prev = get().nearby;
    if (prev.length === nearby.length && prev.every((id, i) => id === nearby[i])) return;
    set({ nearby });
  },
  setZone: zoneId => get().zoneId !== zoneId && set({ zoneId }),
  setKnock: knock => get().knock !== knock && set({ knock }),
  setInsideRoom: insideRoom => get().insideRoom !== insideRoom && set({ insideRoom }),
  toast: text => {
    const id = ++toastId;
    set(s => ({ toasts: [...s.toasts, { id, text }].slice(-3) }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4200);
  },
}));

export const personById = (id: string) => useOffice.getState().people.find(p => p.id === id);

// Test hook: lets e2e tests read the player position and store without poking at WebGL.
if (import.meta.env.DEV) {
  (window as unknown as { __office: unknown }).__office = { player, positions, remotes, useOffice };
}
