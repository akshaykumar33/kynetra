import { describe, expect, it } from 'vitest';
import { deskById, ROOM, SPAWN } from './layout';
import { blocked } from './movement';
import { clearLine, findPath } from './pathfinding';

function walkable(start: { x: number; z: number }, path: { x: number; z: number }[], doorOpen = false) {
  let prev = start;
  for (const p of path) {
    if (!clearLine(prev, p, doorOpen)) return false;
    prev = p;
  }
  return true;
}

describe('findPath', () => {
  it('goes straight when nothing is in the way', () => {
    expect(findPath({ x: 0, z: 6 }, { x: 4, z: 6 }, false)).toEqual([{ x: 4, z: 6 }]);
  });

  it('routes around the reception desk to reach a colleague', () => {
    const d = deskById('design-0');
    const target = { x: d.x, z: d.z + d.facing * 0.85 };
    const path = findPath(SPAWN, target, false);
    expect(path.length).toBeGreaterThan(1);
    expect(walkable(SPAWN, path)).toBe(true);
    const end = path[path.length - 1];
    expect(Math.hypot(end.x - target.x, end.z - target.z)).toBeLessThan(1);
  });

  it('ends next to furniture when the target is inside it', () => {
    const d = deskById('support-0');
    const path = findPath(SPAWN, { x: d.x, z: d.z }, false);
    const end = path[path.length - 1];
    expect(blocked(end.x, end.z, false)).toBe(false);
  });

  it('finds no route into the meeting room while the door is closed', () => {
    expect(findPath(SPAWN, { x: ROOM.x, z: ROOM.z }, false)).toEqual([]);
  });

  it('enters the meeting room once the door is open', () => {
    const path = findPath(SPAWN, { x: ROOM.x, z: ROOM.z }, true);
    expect(walkable(SPAWN, path, true)).toBe(true);
    const end = path[path.length - 1];
    expect(Math.hypot(end.x - ROOM.x, end.z - ROOM.z)).toBeLessThan(1);
  });
});
