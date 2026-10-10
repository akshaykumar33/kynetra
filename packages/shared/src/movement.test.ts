import { describe, expect, it } from 'vitest';
import { ROOM, ROOM_DOOR, SPAWN, desks } from './layout';
import { blocked, isInsideRoom, step } from './movement';

describe('blocked', () => {
  it('lets you stand at the spawn point', () => {
    expect(blocked(SPAWN.x, SPAWN.z, false)).toBe(false);
  });
  it('blocks desks', () => {
    expect(blocked(desks[0].x, desks[0].z, false)).toBe(true);
  });
  it('blocks the outer walls', () => {
    expect(blocked(19.8, 0, false)).toBe(true);
    expect(blocked(0, -13.8, false)).toBe(true);
  });
  it('blocks the meeting room doorway only while the door is closed', () => {
    expect(blocked(ROOM_DOOR.x, ROOM_DOOR.z, false)).toBe(true);
    expect(blocked(ROOM_DOOR.x, ROOM_DOOR.z, true)).toBe(false);
  });
  it('blocks the meeting room side walls even with the door open', () => {
    expect(blocked(ROOM.x - ROOM.w / 2, ROOM.z, true)).toBe(true);
  });
});

describe('step', () => {
  it('moves freely in open space', () => {
    expect(step({ x: 0, z: 12 }, 0.1, -0.1, false)).toEqual({ x: 0.1, z: 11.9 });
  });
  it('slides along a wall instead of stopping', () => {
    // walking diagonally into the east wall keeps the z movement
    const next = step({ x: 19.4, z: 0 }, 0.2, 0.2, false);
    expect(next.x).toBe(19.4);
    expect(next.z).toBeCloseTo(0.2);
  });
});

describe('isInsideRoom', () => {
  it('is true at the room centre and false in the corridor', () => {
    expect(isInsideRoom(ROOM.x, ROOM.z)).toBe(true);
    expect(isInsideRoom(ROOM.x, ROOM.z + ROOM.d)).toBe(false);
  });
});
