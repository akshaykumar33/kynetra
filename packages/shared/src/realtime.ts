import { z } from 'zod';
import { FLOOR } from './layout';
import { blocked, WALK_SPEED } from './movement';

// Wire protocol for live presence on a floor. JSON over one WebSocket per tab.
// Both sides parse with these schemas; anything that doesn't match is dropped.

/** How often clients send their position and the server sends snapshots. */
export const TICK_MS = 100;
/** Remote avatars are drawn this far in the past so there are always two samples to blend. */
export const INTERP_DELAY_MS = 120;

const coord = z.number().finite();
const x = coord.min(-FLOOR.w / 2).max(FLOOR.w / 2);
const zc = coord.min(-FLOOR.d / 2).max(FLOOR.d / 2 + 3);
const status = z.enum(['available', 'meeting', 'focus', 'away']);

export const ClientMessage = z.discriminatedUnion('t', [
  z.object({ t: z.literal('move'), seq: z.number().int().nonnegative(), x, z: zc, ry: coord }),
  z.object({ t: z.literal('status'), status: z.enum(['available', 'focus', 'away']) }),
  z.object({ t: z.literal('ping'), at: z.number() }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export const MemberState = z.object({
  id: z.string(),
  x: coord,
  z: coord,
  ry: coord,
  status,
});
export type MemberState = z.infer<typeof MemberState>;

export const ServerMessage = z.discriminatedUnion('t', [
  z.object({ t: z.literal('welcome'), you: z.string(), members: z.array(MemberState) }),
  z.object({ t: z.literal('join'), member: MemberState }),
  z.object({ t: z.literal('leave'), id: z.string() }),
  // only members that moved since the previous snapshot
  z.object({
    t: z.literal('snapshot'),
    at: z.number(),
    moves: z.array(z.object({ id: z.string(), x: coord, z: coord, ry: coord })),
  }),
  z.object({ t: z.literal('status'), id: z.string(), status }),
  // the server rejected a move; snap back here
  z.object({ t: z.literal('correct'), seq: z.number(), x: coord, z: coord }),
  z.object({ t: z.literal('pong'), at: z.number() }),
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

/**
 * Server-side movement check. A move is accepted when the new spot is walkable and no farther
 * than walking speed allows since the last accepted move (with slack for network jitter).
 * The meeting room door is treated as open: door etiquette is enforced in Phase 05.
 */
export function acceptMove(prev: { x: number; z: number }, next: { x: number; z: number }, elapsedMs: number) {
  if (blocked(next.x, next.z, true)) return false;
  const allowed = WALK_SPEED * Math.max(elapsedMs, TICK_MS) * 1.5e-3 + 0.5;
  return Math.hypot(next.x - prev.x, next.z - prev.z) <= allowed;
}
