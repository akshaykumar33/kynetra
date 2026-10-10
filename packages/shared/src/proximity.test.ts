import { describe, expect, it } from 'vitest';
import { ROOM } from './layout';
import { nearbyIds, VOICE_RANGE } from './proximity';

const me = { x: 0, z: 5 };

describe('nearbyIds', () => {
  it('includes people inside voice range and excludes those outside', () => {
    const others: [string, { x: number; z: number }][] = [
      ['close', { x: 1, z: 5 }],
      ['edge', { x: VOICE_RANGE + 0.01, z: 5 }],
    ];
    expect(nearbyIds(me, others, { close: 'available', edge: 'available' })).toEqual(['close']);
  });
  it('skips people who are away', () => {
    expect(nearbyIds(me, [['a', { x: 1, z: 5 }]], { a: 'away' })).toEqual([]);
  });
  it('keeps focusing people so the UI can offer a note', () => {
    expect(nearbyIds(me, [['a', { x: 1, z: 5 }]], { a: 'focus' })).toEqual(['a']);
  });
  it('does not hear through the meeting room walls', () => {
    const inside = { x: ROOM.x, z: ROOM.z + ROOM.d / 2 - 0.5 };
    const outside = { x: ROOM.x, z: ROOM.z + ROOM.d / 2 + 0.6 };
    expect(nearbyIds(outside, [['in', inside]], { in: 'meeting' })).toEqual([]);
  });
  it('returns ids sorted so the result is stable', () => {
    const others: [string, { x: number; z: number }][] = [
      ['b', { x: 1, z: 5 }],
      ['a', { x: -1, z: 5 }],
    ];
    expect(nearbyIds(me, others, { a: 'available', b: 'available' })).toEqual(['a', 'b']);
  });
});
