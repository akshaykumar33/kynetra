import type { Status } from './layout';
import { isInsideRoom } from './movement';

/** You start hearing someone when they come this close… */
export const VOICE_ENTER = 3.2;
/** …and stop only once they are this far, so standing at the edge doesn't flicker on and off. */
export const VOICE_LEAVE = 4.0;

interface Point {
  x: number;
  z: number;
}

/**
 * Who you should be hearing right now. Same side of the meeting room walls, nobody focusing or away
 * (you can't hear them and they can't hear you), and within range with hysteresis: people already in
 * `current` stay until VOICE_LEAVE, newcomers join at VOICE_ENTER. If you are focusing, nobody.
 */
export function voiceTargets(
  me: Point,
  myStatus: Status,
  others: Iterable<[string, Point]>,
  statuses: Record<string, Status>,
  current: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  if (myStatus === 'focus' || myStatus === 'away') return out;
  const meInside = isInsideRoom(me.x, me.z);
  for (const [id, p] of others) {
    const s = statuses[id];
    if (s === 'focus' || s === 'away') continue;
    if (isInsideRoom(p.x, p.z) !== meInside) continue;
    const d = Math.hypot(p.x - me.x, p.z - me.z);
    if (d < (current.has(id) ? VOICE_LEAVE : VOICE_ENTER)) out.add(id);
  }
  return out;
}

/** Playback volume for someone `distance` metres away: full up close, fading to silence at VOICE_LEAVE. */
export function voiceVolume(distance: number): number {
  const t = Math.max(0, Math.min(1, 1 - distance / VOICE_LEAVE));
  return Math.max(0.05, t ** 1.5);
}
