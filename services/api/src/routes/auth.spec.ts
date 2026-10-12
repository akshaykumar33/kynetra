import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { checkDatabaseHealth } from '../db/index.js';

describe('Auth & Session API Endpoints', () => {
  let app: FastifyInstance;
  let isDbConnected = false;

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbConnected = health.status === 'healthy';
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login authenticates real admin user via email', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'admin@kynetra.dev',
        password: 'admin',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('admin@kynetra.dev');
    expect(body.user.role).toBe('admin');
    expect(body.user.handle).toBe('admin');
  });

  it('POST /api/v1/auth/login authenticates real admin user via handle', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'admin',
        password: 'admin',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('admin');
  });

  it('POST /api/v1/auth/login rejects unknown user', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'nonexistent_user@kynetra.dev',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('No user matching');
  });

  it('GET /api/v1/auth/me resolves user profile with valid Bearer token', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'admin@kynetra.dev',
        password: 'admin',
      },
    });
    const loginBody = JSON.parse(loginRes.body);

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.body);
    expect(meBody.user.id).toBe('usr_admin_01');
    expect(meBody.user.role).toBe('admin');
  });
});
