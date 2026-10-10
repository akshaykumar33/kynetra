import type { Status } from './layout';
import { isInsideRoom } from './movement';

export const VOICE_RANGE = 3.2;

interface Point {
  x: number;
  z: number;
}

/**
 * Ids of people who can hear the player: within range, not away, and on the same side
 * of the meeting room walls. Sorted so the result is stable between frames.
 */
export function nearbyIds(
  me: Point,
  others: Iterable<[string, Point]>,
  statuses: Record<string, Status>,
  range = VOICE_RANGE,
): string[] {
  const meInside = isInsideRoom(me.x, me.z);
  const out: string[] = [];
  for (const [id, p] of others) {
    if (statuses[id] === 'away') continue;
    if (isInsideRoom(p.x, p.z) !== meInside) continue;
    if (Math.hypot(p.x - me.x, p.z - me.z) < range) out.push(id);
  }
  return out.sort();
}
