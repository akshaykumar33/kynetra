import { describe, expect, it } from 'vitest';
import type { WorldDistrict } from '@kynetra/contracts';
import { occupancyRatio, resolveSelection, summarizeWorld } from './selection';

const central: WorldDistrict = {
  id: 'central',
  name: 'Central',
  theme: 'Civic',
  description: 'Civic core',
  coordinates: { x: 0, y: 0 },
  status: 'active',
  activeUsers: 10,
  keyLandmark: 'Tower',
  floors: [
    {
      floorNumber: 4,
      name: 'Arena',
      category: 'coding_arena',
      description: 'Pods',
      capacity: 100,
      currentOccupancy: 50,
      nodes: [
        {
          id: 'pod',
          name: 'Pod',
          type: 'coding_pod',
          position: { x: 0, y: 0, z: 0 },
          description: 'A pod',
          activeSessionCount: 3,
        },
      ],
    },
  ],
};

const outskirts: WorldDistrict = {
  ...central,
  id: 'outskirts',
  status: 'in_construction',
  activeUsers: 2,
  floors: undefined,
};

describe('resolveSelection', () => {
  it('falls back to the first district when nothing is selected yet', () => {
    const result = resolveSelection([central, outskirts], {
      districtId: null,
      floorNumber: null,
      nodeId: null,
    });
    expect(result.district?.id).toBe('central');
    expect(result.floor).toBeNull();
  });

  it('resolves a full district → floor → node path', () => {
    const result = resolveSelection([central], {
      districtId: 'central',
      floorNumber: 4,
      nodeId: 'pod',
    });
    expect(result.floor?.name).toBe('Arena');
    expect(result.node?.id).toBe('pod');
  });

  it('clears a floor that no longer exists instead of jumping to another one', () => {
    const result = resolveSelection([central], {
      districtId: 'central',
      floorNumber: 9,
      nodeId: 'pod',
    });
    expect(result.floor).toBeNull();
    expect(result.node).toBeNull();
  });

  it('returns an empty selection for an empty world', () => {
    const result = resolveSelection([], { districtId: 'central', floorNumber: 4, nodeId: null });
    expect(result).toEqual({ district: null, floor: null, node: null });
  });
});

describe('summarizeWorld', () => {
  it('derives every headline number from the data it is given', () => {
    expect(summarizeWorld([central, outskirts], 12)).toEqual({
      onlineNow: 12,
      districtsOperational: 1,
      districtsTotal: 2,
      liveSessions: 3,
    });
  });
});

describe('occupancyRatio', () => {
  it('clamps over-capacity and handles zero capacity', () => {
    expect(occupancyRatio({ capacity: 10, currentOccupancy: 5 })).toBe(0.5);
    expect(occupancyRatio({ capacity: 10, currentOccupancy: 25 })).toBe(1);
    expect(occupancyRatio({ capacity: 0, currentOccupancy: 5 })).toBe(0);
  });
});
