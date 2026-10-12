import { FLOOR, inRect, obstacles, ROOM, ROOM_DOOR, type Rect } from './layout';

export const BODY_RADIUS = 0.35;
export const WALK_SPEED = 3.4;

const doorBlock: Rect = { x: ROOM_DOOR.x, z: ROOM_DOOR.z, w: ROOM_DOOR.w, d: 0.2 };
export const roomInterior: Rect = { x: ROOM.x, z: ROOM.z, w: ROOM.w - 0.3, d: ROOM.d - 0.3 };

/** True when a body centred at (x, z) would overlap a wall, furniture or the closed door. */
export function blocked(x: number, z: number, doorOpen: boolean): boolean {
  if (Math.abs(x) > FLOOR.w / 2 - 0.5 || z < -FLOOR.d / 2 + 0.5 || z > FLOOR.d / 2 + 3) return true;
  if (!doorOpen && inRect(x, z, doorBlock, BODY_RADIUS)) return true;
  return obstacles.some(o => inRect(x, z, o, BODY_RADIUS));
}

/** Moves one step, sliding along obstacles by trying each axis separately. */
export function step(from: { x: number; z: number }, dx: number, dz: number, doorOpen: boolean) {
  let { x, z } = from;
  if (!blocked(x + dx, z, doorOpen)) x += dx;
  if (!blocked(x, z + dz, doorOpen)) z += dz;
  return { x, z };
}

export const isInsideRoom = (x: number, z: number) => inRect(x, z, roomInterior);
