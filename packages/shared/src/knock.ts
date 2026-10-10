import { ROOM_DOOR } from './layout';
import { isInsideRoom } from './movement';

export type KnockState = 'none' | 'available' | 'waiting' | 'admitted' | 'declined';

/** True when the player stands just outside the meeting room door. */
export function atDoor(x: number, z: number): boolean {
  return !isInsideRoom(x, z) && Math.abs(x - ROOM_DOOR.x) < 1.8 && z > ROOM_DOOR.z && z - ROOM_DOOR.z < 2.2;
}

/** Knock state driven by where the player stands. Button presses move it to waiting/admitted. */
export function nextKnock(state: KnockState, x: number, z: number): KnockState {
  const here = atDoor(x, z);
  if (state === 'none' && here) return 'available';
  if (state === 'available' && !here) return 'none';
  if (
    (state === 'admitted' || state === 'declined') &&
    !isInsideRoom(x, z) &&
    Math.hypot(x - ROOM_DOOR.x, z - ROOM_DOOR.z) > 5
  )
    return 'none';
  return state;
}
