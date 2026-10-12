import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

describe('Presence & Spatial Zones Route Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/presence/zones returns canonical meeting, silent, and lounge zones', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/presence/zones',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.zones).toBeDefined();
    expect(body.zones.length).toBeGreaterThanOrEqual(3);

    const meetingZone = body.zones.find((z: any) => z.type === 'meeting');
    expect(meetingZone).toBeDefined();
    expect(meetingZone.id).toBe('zone-all-hands');

    const silentZone = body.zones.find((z: any) => z.type === 'silent');
    expect(silentZone).toBeDefined();
    expect(silentZone.id).toBe('zone-focus-pod');
  });

  it('POST /api/v1/presence/heartbeat registers real peer presence and updates state', async () => {
    const payload = {
      peerId: 'peer-test-client-99',
      userId: 'user-test-99',
      name: 'Test Cadet',
      role: 'employee',
      position: { x: 2, y: 0, z: 3 },
      rotation: 0,
      zoneId: null,
      status: 'online',
      mediaState: {
        micOn: true,
        cameraOn: false,
        screenSharing: false,
        speaking: true,
      },
      avatarColor: '#22c55e',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/presence/heartbeat',
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.peer.peerId).toBe('peer-test-client-99');
    expect(body.peer.mediaState.speaking).toBe(true);
  });

  it('GET /api/v1/presence/peers returns active peers registered via heartbeat', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/presence/peers',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.peers).toBeDefined();
    expect(body.peers.length).toBeGreaterThanOrEqual(1);

    const cadet = body.peers.find((p: any) => p.peerId === 'peer-test-client-99');
    expect(cadet).toBeDefined();
    expect(cadet.name).toBe('Test Cadet');
  });
});

