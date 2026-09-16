import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

describe('API Service Endpoints', () => {
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
    expect(body.status).toBe('healthy');
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/world/districts returns list of districts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/world/districts',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.districts)).toBe(true);
    expect(body.districts.length).toBeGreaterThan(0);
    expect(body.totalActiveUsers).toBeGreaterThan(0);
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

  it('GET /api/v1/telemetry/stats returns world statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/stats',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalOnlineDevelopers).toBeGreaterThan(0);
    expect(body.systemUptimePercentage).toBe(99.98);
  });
});
