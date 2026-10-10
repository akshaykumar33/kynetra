import { z } from 'zod';

// Floor plan for the prototype: one floor of a hub building, in metres.
// x runs west → east, z runs north → south. The entrance is on the south wall.

export type Status = 'available' | 'meeting' | 'focus' | 'away';

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Zone extends Rect {
  id: string;
  name: string;
  kind: 'team' | 'lounge' | 'meeting' | 'reception';
  color: string;
}

export interface Desk {
  id: string;
  x: number;
  z: number;
  facing: 1 | -1;
  team: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  team: string;
  where: 'office' | 'remote';
  status: Status;
  body: string;
  skin: string;
  hair: string;
  desk: string;
}

export const FLOOR = { w: 40, d: 28 };
export const SPAWN = { x: 0, z: 12 };

export const zones: Zone[] = [
  { id: 'platform', name: 'Platform team', kind: 'team', x: -12, z: -1, w: 10, d: 8, color: '#cfe3f7' },
  { id: 'design', name: 'Design team', kind: 'team', x: 0, z: -1, w: 10, d: 8, color: '#f6dccb' },
  { id: 'support', name: 'Support team', kind: 'team', x: 12, z: -1, w: 10, d: 8, color: '#d8eed6' },
  { id: 'lounge', name: 'Kitchen & lounge', kind: 'lounge', x: -12, z: -10, w: 14, d: 7, color: '#f3e7c4' },
  { id: 'room', name: 'Harbour room', kind: 'meeting', x: 12, z: -10, w: 12, d: 7, color: '#e3dcf3' },
  { id: 'reception', name: 'Reception', kind: 'reception', x: 0, z: 10.5, w: 12, d: 5, color: '#efe9e1' },
];

// Meeting room walls; the door gap is on the south wall.
export const ROOM = zones.find(z => z.id === 'room')!;
export const ROOM_DOOR = { x: ROOM.x - 2, z: ROOM.z + ROOM.d / 2, w: 2 };

function pod(team: string, cx: number, cz: number): Desk[] {
  const out: Desk[] = [];
  for (let i = 0; i < 4; i++) {
    const col = i % 2,
      row = Math.floor(i / 2);
    out.push({ id: `${team}-${i}`, team, x: cx - 1.4 + col * 2.8, z: cz - 1 + row * 2, facing: row ? 1 : -1 });
  }
  return out;
}

export const desks: Desk[] = [...pod('platform', -12, -1), ...pod('design', 0, -1), ...pod('support', 12, -1)];
export const MY_DESK: Desk = { id: 'mine', team: 'design', x: 2.8, z: 3.2, facing: 1 };

// Solid things the player cannot walk through (furniture footprints, walls).
export const obstacles: Rect[] = [
  ...desks.map(d => ({ x: d.x, z: d.z, w: 2.2, d: 1.0 })),
  { x: MY_DESK.x, z: MY_DESK.z, w: 2.2, d: 1.0 },
  // lounge furniture
  { x: -17, z: -12.6, w: 5, d: 1.2 }, // kitchen counter
  { x: -9, z: -10, w: 3.4, d: 1.2 }, // sofa
  { x: -9, z: -8.2, w: 1.6, d: 0.9 }, // coffee table
  // reception desk
  { x: 0, z: 9.6, w: 4, d: 1 },
  // meeting room walls (north, west, east, south either side of the door)
  { x: ROOM.x, z: ROOM.z - ROOM.d / 2, w: ROOM.w, d: 0.2 },
  { x: ROOM.x - ROOM.w / 2, z: ROOM.z, w: 0.2, d: ROOM.d },
  { x: ROOM.x + ROOM.w / 2, z: ROOM.z, w: 0.2, d: ROOM.d },
  {
    x: (ROOM.x - ROOM.w / 2 + ROOM_DOOR.x - ROOM_DOOR.w / 2) / 2,
    z: ROOM_DOOR.z,
    w: ROOM_DOOR.x - ROOM_DOOR.w / 2 - (ROOM.x - ROOM.w / 2),
    d: 0.2,
  },
  {
    x: (ROOM_DOOR.x + ROOM_DOOR.w / 2 + ROOM.x + ROOM.w / 2) / 2,
    z: ROOM_DOOR.z,
    w: ROOM.x + ROOM.w / 2 - (ROOM_DOOR.x + ROOM_DOOR.w / 2),
    d: 0.2,
  },
];

export const deskById = (id: string) => desks.find(d => d.id === id)!;

export function inRect(x: number, z: number, r: Rect, pad = 0) {
  return Math.abs(x - r.x) <= r.w / 2 + pad && Math.abs(z - r.z) <= r.d / 2 + pad;
}

export function zoneAt(x: number, z: number) {
  return zones.find(zn => inRect(x, z, zn)) ?? null;
}

// ---------- serialisable layout ----------
// The floor as one JSON-friendly object. Phase 02 stores this per floor; Phase 06's designer edits it.
const RectSchema = z.object({ x: z.number(), z: z.number(), w: z.number().positive(), d: z.number().positive() });

export const FloorLayoutSchema = z.object({
  version: z.literal(1),
  size: z.object({ w: z.number().positive(), d: z.number().positive() }),
  spawn: z.object({ x: z.number(), z: z.number() }),
  zones: z.array(
    RectSchema.extend({
      id: z.string().min(1),
      name: z.string().min(1),
      kind: z.enum(['team', 'lounge', 'meeting', 'reception']),
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
    }),
  ),
  desks: z.array(
    z.object({
      id: z.string().min(1),
      x: z.number(),
      z: z.number(),
      facing: z.union([z.literal(1), z.literal(-1)]),
      team: z.string(),
    }),
  ),
  obstacles: z.array(RectSchema),
});

export type FloorLayout = z.infer<typeof FloorLayoutSchema>;

export const northgateFloor: FloorLayout = FloorLayoutSchema.parse({
  version: 1,
  size: FLOOR,
  spawn: SPAWN,
  zones,
  desks: [...desks, MY_DESK],
  obstacles,
});
