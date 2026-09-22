import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

describe('API Service Endpoints & Real World State', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns alive', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'alive' });
  });

  it('GET /health/ready returns service health model', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.service).toBe('@kynetra/api');
    expect(['healthy', 'degraded']).toContain(body.status);
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/world/districts returns list of districts with real counts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/world/districts',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.districts)).toBe(true);
    expect(body.districts.length).toBe(4);
    expect(body.totalActiveUsers).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/world/districts/kynetra-central returns Kynetra Central district details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/world/districts/kynetra-central',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe('kynetra-central');
    expect(body.floors.length).toBe(3);
    expect(body.floors[0].nodes.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/telemetry/stats returns live telemetry statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/stats',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalOnlineDevelopers).toBeGreaterThanOrEqual(0);
    expect(body.systemUptimePercentage).toBeGreaterThanOrEqual(99.0);
    expect(body.districtsActive).toBe(4);
  });

  it('POST /api/v1/workstations/:nodeId/connect and disconnect dynamically manages sessions', async () => {
    // 1. Connect
    const connectRes = await app.inject({
      method: 'POST',
      url: '/api/v1/workstations/node-arena-pod-1/connect',
      payload: { userHandle: 'test_dev' },
    });
    expect(connectRes.statusCode).toBe(200);
    const connectBody = connectRes.json();
    expect(connectBody.session.sessionId).toBeDefined();
    expect(connectBody.node.activeSessionCount).toBeGreaterThanOrEqual(1);

    // 2. Execute command
    const execRes = await app.inject({
      method: 'POST',
      url: '/api/v1/workstations/node-arena-pod-1/execute',
      payload: { command: 'status' },
    });
    expect(execRes.statusCode).toBe(200);
    expect(execRes.json().status).toBe('success');

    // 3. Disconnect
    const disconnectRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workstations/${connectBody.session.sessionId}/disconnect`,
    });
    expect(disconnectRes.statusCode).toBe(200);
    expect(disconnectRes.json().success).toBe(true);
  });

  it('POST /api/v1/simulations/start and stop manages real simulation count', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/simulations/start',
      payload: { scenarioId: 'db-starvation' },
    });
    expect(startRes.statusCode).toBe(201);
    const sim = startRes.json();
    expect(sim.id).toBeDefined();

    // Check stats reflects 1 simulation
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/stats',
    });
    expect(statsRes.json().activeSimulations).toBeGreaterThanOrEqual(1);

    // Stop simulation
    const stopRes = await app.inject({
      method: 'POST',
      url: `/api/v1/simulations/${sim.id}/stop`,
    });
    expect(stopRes.statusCode).toBe(200);
  });

  it('POST /api/v1/arena/matches/start and stop manages live arena duels', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/arena/matches/start',
      payload: { title: 'LRU Cache Test', difficulty: 'medium' },
    });
    expect(startRes.statusCode).toBe(201);
    const match = startRes.json();
    expect(match.id).toBeDefined();

    // Stop match
    const stopRes = await app.inject({
      method: 'POST',
      url: `/api/v1/arena/matches/${match.id}/stop`,
    });
    expect(stopRes.statusCode).toBe(200);
  });

  it('GET /api/v1/telemetry/live returns high-frequency real-time metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/live',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cpuUsagePercent).toBeDefined();
    expect(body.memoryUsagePercent).toBeDefined();
    expect(body.p99LatencyMs).toBeDefined();
  });

  it('POST /api/v1/simulations/submit-patch mitigates active incident and awards XP', async () => {
    // Start incident
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/simulations/start',
      payload: { scenarioId: 'db-starvation' },
    });
    const sim = startRes.json();

    // Submit patch
    const patchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/simulations/submit-patch',
      payload: {
        simulationId: sim.id,
        userHandle: 'developer',
        patchConfig: { maxConnections: 50 },
      },
    });

    expect(patchRes.statusCode).toBe(200);
    const patchBody = patchRes.json();
    expect(patchBody.success).toBe(true);
    expect(patchBody.status).toBe('resolved');
    expect(patchBody.xpAwarded).toBe(500);
    expect(patchBody.badgeUnlocked).toBe('Pool Starvation Hero');
  });

  it('POST /api/v1/ai/chat returns contextual guidance from Aria', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      payload: {
        message: 'How do I resolve PostgreSQL connection pool starvation?',
        contextTopic: 'sre_incident',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sender).toContain('Aria');
    expect(body.reply).toContain('Connection Pool Starvation');
    expect(body.suggestedActions.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/gamification/leaderboard and profile returns progression data', async () => {
    const leadRes = await app.inject({
      method: 'GET',
      url: '/api/v1/gamification/leaderboard',
    });
    expect(leadRes.statusCode).toBe(200);
    expect(leadRes.json().leaderboard.length).toBeGreaterThan(0);

    const profRes = await app.inject({
      method: 'GET',
      url: '/api/v1/gamification/profile/developer',
    });
    expect(profRes.statusCode).toBe(200);
    const profile = profRes.json();
    expect(profile.handle).toBe('developer');
    expect(profile.level).toBeGreaterThanOrEqual(1);
    expect(profile.badges).toBeDefined();
  });
});

