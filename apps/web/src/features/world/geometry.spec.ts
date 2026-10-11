import { describe, expect, it } from 'vitest';
import {
  DISTRICT_RADIUS,
  EXPLODE_LIFT,
  MIN_TOWER_LEVELS,
  TOWER_WIDTH,
  cameraShot,
  districtBlocks,
  districtCenter,
  levelOffset,
  nodeWorldPosition,
  towerLevels,
} from './geometry';

const district = {
  id: 'developer-district',
  coordinates: { x: 250, y: 50 },
  status: 'active' as const,
};

describe('districtBlocks', () => {
  it('is deterministic, so the 2D map and 3D city draw the same footprint', () => {
    expect(districtBlocks(district)).toEqual(districtBlocks(district));
  });

  it('keeps every block inside the district and clear of the landmark', () => {
    const [cx, cz] = districtCenter(district);
    for (const block of districtBlocks(district)) {
      const distance = Math.hypot(block.x - cx, block.z - cz);
      expect(distance).toBeLessThanOrEqual(DISTRICT_RADIUS + 0.3);
      expect(distance).toBeGreaterThan(2.5);
    }
  });

  it('builds lower massing for districts under construction', () => {
    const tallest = (status: 'active' | 'in_construction') =>
      Math.max(...districtBlocks({ ...district, status }).map((b) => b.height));
    expect(tallest('in_construction')).toBeLessThan(tallest('active'));
  });
});

describe('towerLevels', () => {
  it('pads the tower to a minimum height and places programmed floors', () => {
    const levels = towerLevels([
      {
        floorNumber: 4,
        name: 'Arena',
        category: 'coding_arena',
        description: '',
        capacity: 1,
        currentOccupancy: 0,
        nodes: [],
      },
    ]);
    expect(levels).toHaveLength(MIN_TOWER_LEVELS);
    expect(levels[3]?.floor?.name).toBe('Arena');
    expect(levels[0]?.floor).toBeNull();
  });
});

describe('levelOffset', () => {
  it('lifts only the levels above the selected floor', () => {
    expect(levelOffset(5, 4)).toBe(EXPLODE_LIFT);
    expect(levelOffset(4, 4)).toBe(0);
    expect(levelOffset(5, null)).toBe(0);
  });
});

describe('nodeWorldPosition', () => {
  it('keeps nodes inside the tower footprint however far out the floorplan puts them', () => {
    const [x, , z] = nodeWorldPosition({ position: { x: 500, y: 0, z: -500 } }, 1);
    expect(Math.abs(x)).toBeLessThan(TOWER_WIDTH / 2);
    expect(Math.abs(z)).toBeLessThan(TOWER_WIDTH / 2);
  });
});

describe('cameraShot', () => {
  const tower = { coordinates: { x: 0, y: 0 }, floors: [] };

  it('frames closer as the selection narrows', () => {
    const distance = (shot: ReturnType<typeof cameraShot>) =>
      Math.hypot(...shot.position.map((p, i) => p - shot.target[i]!));
    const districtShot = cameraShot({ district: tower, floor: null, node: null });
    const floorShot = cameraShot({ district: tower, floor: { floorNumber: 4 }, node: null });
    const nodeShot = cameraShot({
      district: tower,
      floor: { floorNumber: 4 },
      node: { position: { x: 1, y: 0, z: 1 } },
    });
    expect(distance(floorShot)).toBeLessThan(distance(districtShot));
    expect(distance(nodeShot)).toBeLessThan(distance(floorShot));
  });

  it('always keeps the camera above its target', () => {
    const shot = cameraShot({ district: tower, floor: { floorNumber: 8 }, node: null });
    expect(shot.position[1]).toBeGreaterThan(shot.target[1]);
  });
});
