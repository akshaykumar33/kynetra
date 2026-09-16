import { describe, it, expect } from 'vitest';
import { WorldDistrictSchema, ServiceHealthSchema } from './index.js';

describe('Contracts Schema Validation', () => {
  it('validates WorldDistrict correctly', () => {
    const validDistrict = {
      id: 'kynetra-central',
      name: 'Kynetra Central',
      theme: 'Civic & Headquarters',
      description: 'The heartbeat of Kynetra containing Central Plaza and the Innovation Tower.',
      coordinates: { x: 0, y: 0 },
      status: 'active',
      activeUsers: 142,
      keyLandmark: 'Innovation Tower',
      floors: [
        {
          floorNumber: 1,
          name: 'Lobby & Reception',
          category: 'lobby',
          description: 'Grand entrance and AI Receptionist concourse',
          capacity: 200,
          currentOccupancy: 42,
          nodes: [
            {
              id: 'node-reception',
              name: 'AI Reception Desk',
              type: 'receptionist_npc',
              position: { x: 0, y: 0, z: 0 },
              description: 'Primary AI guide for newcomers',
              activeSessionCount: 3,
            },
          ],
        },
      ],
    };

    const parsed = WorldDistrictSchema.parse(validDistrict);
    expect(parsed.id).toBe('kynetra-central');
    expect(parsed.floors?.length).toBe(1);
  });

  it('validates ServiceHealth model correctly', () => {
    const validHealth = {
      service: '@kynetra/api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120.5,
      memoryUsageMb: 85.2,
      version: '0.1.0',
    };

    const parsed = ServiceHealthSchema.parse(validHealth);
    expect(parsed.status).toBe('healthy');
    expect(parsed.uptimeSeconds).toBeGreaterThan(0);
  });
});
