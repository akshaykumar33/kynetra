import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { checkDatabaseHealth } from '../db/index.js';

describe('Admin Real User Management API Endpoints', () => {
  let app: FastifyInstance;
  let testUserId = '';
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

  it('GET /api/v1/admin/users returns real users from database', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThanOrEqual(1);

    const admin = body.users.find((u: any) => u.role === 'admin');
    expect(admin).toBeDefined();
    expect(admin.email).toBe('admin@kynetra.dev');
  });

  it('POST /api/v1/admin/users creates a new real user in PostgreSQL', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const uniqueEmail = `testcadet_${Date.now()}@kynetra.dev`;
    const uniqueHandle = `cadet_${Date.now().toString(36)}`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      payload: {
        email: uniqueEmail,
        handle: uniqueHandle,
        displayName: 'Cadet Marcus Cole',
        role: 'architect',
        xp: 250,
        currentDistrictId: 'kynetra-central',
        statusMessage: 'Architecting high-concurrency microservices',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(uniqueEmail);
    expect(body.user.role).toBe('architect');
    expect(body.user.id).toBeDefined();
    testUserId = body.user.id;
  });

  it('PUT /api/v1/admin/users/:id updates an existing user in PostgreSQL', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    expect(testUserId).toBeTruthy();

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${testUserId}`,
      payload: {
        role: 'admin',
        xp: 750,
        statusMessage: 'Promoted to Executive Admin',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('admin');
    expect(body.user.xp).toBe(750);
  });

  it('DELETE /api/v1/admin/users/:id protects root admin from deletion', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/users/usr_admin_01',
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Cannot delete primary root administrator');
  });

  it('DELETE /api/v1/admin/users/:id deletes created test user', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }
    expect(testUserId).toBeTruthy();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${testUserId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.deletedId).toBe(testUserId);
  });
});
