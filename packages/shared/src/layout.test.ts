import { describe, expect, it } from 'vitest';
import { FloorLayoutSchema, inRect, northgateFloor, zoneAt } from './layout';

describe('inRect', () => {
  const r = { x: 0, z: 0, w: 2, d: 4 };
  it('includes the edges', () => {
    expect(inRect(1, 2, r)).toBe(true);
    expect(inRect(-1, -2, r)).toBe(true);
  });
  it('excludes points just outside', () => {
    expect(inRect(1.01, 0, r)).toBe(false);
    expect(inRect(0, 2.01, r)).toBe(false);
  });
  it('grows by the padding', () => {
    expect(inRect(1.3, 0, r, 0.35)).toBe(true);
  });
});

describe('zoneAt', () => {
  it('finds the zone under a point', () => {
    expect(zoneAt(0, -1)?.id).toBe('design');
    expect(zoneAt(-12, -10)?.id).toBe('lounge');
  });
  it('returns null in corridors', () => {
    expect(zoneAt(0, 5.5)).toBeNull();
  });
});

describe('FloorLayoutSchema', () => {
  it('accepts the Northgate floor', () => {
    expect(FloorLayoutSchema.safeParse(northgateFloor).success).toBe(true);
  });
  it('rejects a zone with a bad colour', () => {
    const bad = { ...northgateFloor, zones: [{ ...northgateFloor.zones[0], color: 'blue' }] };
    expect(FloorLayoutSchema.safeParse(bad).success).toBe(false);
  });
  it('rejects zero-size obstacles', () => {
    const bad = { ...northgateFloor, obstacles: [{ x: 0, z: 0, w: 0, d: 1 }] };
    expect(FloorLayoutSchema.safeParse(bad).success).toBe(false);
  });
});
