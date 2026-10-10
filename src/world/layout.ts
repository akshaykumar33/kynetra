// Floor plan for the prototype: one floor of a hub building, in metres.
// x runs west → east, z runs north → south. The entrance is on the south wall.

export type Status = 'available' | 'meeting' | 'focus' | 'away';

export interface Rect { x: number; z: number; w: number; d: number }

export interface Zone extends Rect {
  id: string;
  name: string;
  kind: 'team' | 'lounge' | 'meeting' | 'reception';
  color: string;
}

export interface Desk { id: string; x: number; z: number; facing: 1 | -1; team: string }

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
    const col = i % 2, row = Math.floor(i / 2);
    out.push({ id: `${team}-${i}`, team, x: cx - 1.4 + col * 2.8, z: cz - 1 + row * 2, facing: row ? 1 : -1 });
  }
  return out;
}

export const desks: Desk[] = [...pod('platform', -12, -1), ...pod('design', 0, -1), ...pod('support', 12, -1)];
export const MY_DESK: Desk = { id: 'mine', team: 'design', x: 2.8, z: 3.2, facing: 1 };

export const people: Person[] = [
  { id: 'asha', name: 'Asha Rao', role: 'Eng manager', team: 'platform', where: 'remote', status: 'meeting', body: '#4f7cac', skin: '#c68b62', hair: '#2b1d16', desk: 'platform-0' },
  { id: 'tomas', name: 'Tomás Ortega', role: 'Backend', team: 'platform', where: 'office', status: 'available', body: '#e07a5f', skin: '#e2b48f', hair: '#4a3222', desk: 'platform-1' },
  { id: 'mei', name: 'Mei Lin', role: 'SRE', team: 'platform', where: 'remote', status: 'focus', body: '#3d8a7a', skin: '#efc9a4', hair: '#151515', desk: 'platform-2' },
  { id: 'kofi', name: 'Kofi Mensah', role: 'Backend', team: 'platform', where: 'remote', status: 'meeting', body: '#8d6cab', skin: '#7a4b2f', hair: '#120c08', desk: 'platform-3' },
  { id: 'lena', name: 'Lena Fischer', role: 'Product designer', team: 'design', where: 'office', status: 'available', body: '#d9a441', skin: '#f1cfb1', hair: '#b07a3c', desk: 'design-0' },
  { id: 'arjun', name: 'Arjun Nair', role: 'UX research', team: 'design', where: 'remote', status: 'available', body: '#5b8f4e', skin: '#a8704a', hair: '#1b1411', desk: 'design-1' },
  { id: 'sofia', name: 'Sofia Costa', role: 'Brand', team: 'design', where: 'remote', status: 'away', body: '#c45d7a', skin: '#d9a27c', hair: '#5a2e1c', desk: 'design-2' },
  { id: 'noah', name: 'Noah Kim', role: 'Support lead', team: 'support', where: 'office', status: 'available', body: '#4a6fa5', skin: '#ecc19c', hair: '#202020', desk: 'support-0' },
  { id: 'priya', name: 'Priya Shah', role: 'Support', team: 'support', where: 'remote', status: 'available', body: '#b5654d', skin: '#b67c56', hair: '#1a110c', desk: 'support-1' },
  { id: 'ola', name: 'Ola Nowak', role: 'Support', team: 'support', where: 'remote', status: 'focus', body: '#6b8f9c', skin: '#f3d3b8', hair: '#c9a46b', desk: 'support-2' },
  { id: 'sam', name: 'Sam Okafor', role: 'Solutions', team: 'support', where: 'office', status: 'available', body: '#9a7b4f', skin: '#6e4329', hair: '#0e0a07', desk: 'support-3' },
];

export const ME = { name: 'You', body: '#2f6f8f', skin: '#d6a07a', hair: '#3a2416' };

// Solid things the player cannot walk through (furniture footprints, walls).
export const obstacles: Rect[] = [
  ...desks.map(d => ({ x: d.x, z: d.z, w: 2.2, d: 1.0 })),
  { x: MY_DESK.x, z: MY_DESK.z, w: 2.2, d: 1.0 },
  // lounge furniture
  { x: -17, z: -12.6, w: 5, d: 1.2 }, // kitchen counter
  { x: -9, z: -10, w: 3.4, d: 1.2 },  // sofa
  { x: -9, z: -8.2, w: 1.6, d: 0.9 }, // coffee table
  // reception desk
  { x: 0, z: 9.6, w: 4, d: 1 },
  // meeting room walls (north, west, east, south either side of the door)
  { x: ROOM.x, z: ROOM.z - ROOM.d / 2, w: ROOM.w, d: 0.2 },
  { x: ROOM.x - ROOM.w / 2, z: ROOM.z, w: 0.2, d: ROOM.d },
  { x: ROOM.x + ROOM.w / 2, z: ROOM.z, w: 0.2, d: ROOM.d },
  { x: (ROOM.x - ROOM.w / 2 + ROOM_DOOR.x - ROOM_DOOR.w / 2) / 2, z: ROOM_DOOR.z, w: ROOM_DOOR.x - ROOM_DOOR.w / 2 - (ROOM.x - ROOM.w / 2), d: 0.2 },
  { x: (ROOM_DOOR.x + ROOM_DOOR.w / 2 + ROOM.x + ROOM.w / 2) / 2, z: ROOM_DOOR.z, w: ROOM.x + ROOM.w / 2 - (ROOM_DOOR.x + ROOM_DOOR.w / 2), d: 0.2 },
];

export const deskById = (id: string) => desks.find(d => d.id === id)!;

export function inRect(x: number, z: number, r: Rect, pad = 0) {
  return Math.abs(x - r.x) <= r.w / 2 + pad && Math.abs(z - r.z) <= r.d / 2 + pad;
}

export function zoneAt(x: number, z: number) {
  return zones.find(zn => inRect(x, z, zn)) ?? null;
}
