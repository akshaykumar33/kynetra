import { Vector3 } from 'three';
import { create } from 'zustand';
import { people, SPAWN, type Status } from './world/layout';

// Per-frame positions live outside React so movement never re-renders the tree.
export const positions = new Map<string, Vector3>();
export const player = {
  pos: new Vector3(SPAWN.x, 0, SPAWN.z),
  target: null as Vector3 | null,
};

export type KnockState = 'none' | 'available' | 'waiting' | 'admitted' | 'declined';

interface Toast { id: number; text: string }

interface OfficeState {
  myStatus: Status;
  statuses: Record<string, Status>;
  nearby: string[];          // colleagues inside voice range
  zoneId: string | null;     // zone the player stands in
  knock: KnockState;
  insideRoom: boolean;
  toasts: Toast[];
  setMyStatus: (s: Status) => void;
  setNearby: (ids: string[]) => void;
  setZone: (id: string | null) => void;
  setKnock: (k: KnockState) => void;
  setInsideRoom: (v: boolean) => void;
  toast: (text: string) => void;
}

let toastId = 0;

export const useOffice = create<OfficeState>((set, get) => ({
  myStatus: 'available',
  statuses: Object.fromEntries(people.map(p => [p.id, p.status])),
  nearby: [],
  zoneId: null,
  knock: 'none',
  insideRoom: false,
  toasts: [],
  setMyStatus: myStatus => set({ myStatus }),
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

export const VOICE_RANGE = 3.2;
