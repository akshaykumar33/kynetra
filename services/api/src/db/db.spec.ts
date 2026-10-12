import { describe, it, expect, beforeAll } from 'vitest';
import { db, checkDatabaseHealth } from './index.js';
import { eq } from 'drizzle-orm';
import {
  organizations,
  users,
  tenantMemberships,
  districts,
  buildings,
  floors,
  interactiveNodes,
} from './schema.js';

describe('Database Connection, Health & Seed Verification', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbConnected = health.status === 'healthy';
  });

  it('checkDatabaseHealth returns structured health object', async () => {
    const health = await checkDatabaseHealth();
    expect(health.status).toBeDefined();
    expect(['healthy', 'unhealthy']).toContain(health.status);
    expect(health.latencyMs).toBeDefined();
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('has Kynetra Foundation organization seeded', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'kynetra-foundation'));

    expect(orgs.length).toBe(1);
    expect(orgs[0].name).toBe('Kynetra Foundation');
    expect(orgs[0].subscriptionTier).toBe('enterprise');
    expect(orgs[0].domain).toBe('kynetra.dev');
  });

  it('has real primary administrator user account', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const allUsers = await db.select().from(users);
    expect(allUsers.length).toBeGreaterThanOrEqual(1);

    const admin = allUsers.find((u) => u.role === 'admin');
    expect(admin).toBeDefined();
    expect(admin?.email).toBe('admin@kynetra.dev');
    expect(admin?.handle).toBe('admin');
    expect(admin?.displayName).toBe('Admin');
  });

  it('has tenant memberships linking admin to Kynetra Foundation', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const memberships = await db.select().from(tenantMemberships);
    expect(memberships.length).toBeGreaterThanOrEqual(1);
    expect(memberships.some((m) => m.userId === 'usr_admin_01')).toBe(true);
  });


  it('has 4 canonical districts seeded', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const allDistricts = await db.select().from(districts);
    expect(allDistricts.length).toBe(4);

    const ids = allDistricts.map((d) => d.id).sort();
    expect(ids).toEqual([
      'ai-research-district',
      'cybersecurity-district',
      'developer-district',
      'kynetra-central',
    ]);

    const central = allDistricts.find((d) => d.id === 'kynetra-central');
    expect(central?.name).toBe('Kynetra Central');
    expect(central?.keyLandmark).toBe('Innovation Tower');
    expect(central?.coordX).toBe(0);
    expect(central?.coordY).toBe(0);
  });

  it('has 4 canonical buildings seeded', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const allBuildings = await db.select().from(buildings);
    expect(allBuildings.length).toBe(4);

    const tower = allBuildings.find((b) => b.id === 'building-innovation-tower');
    expect(tower).toBeDefined();
    expect(tower?.name).toBe('Innovation Tower');
    expect(tower?.code).toBe('INNO');
    expect(tower?.districtId).toBe('kynetra-central');
    expect(tower?.totalFloors).toBe(10);
  });

  it('has Innovation Tower floors 1, 4, and 8 with interactive nodes', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const innoFloors = await db
      .select()
      .from(floors)
      .where(eq(floors.buildingId, 'building-innovation-tower'));

    expect(innoFloors.length).toBe(3);
    const floorNumbers = innoFloors.map((f) => f.floorNumber).sort((a, b) => a - b);
    expect(floorNumbers).toEqual([1, 4, 8]);

    // Check Lobby nodes (Aria Receptionist & Arena Portal)
    const lobbyFloor = innoFloors.find((f) => f.floorNumber === 1);
    expect(lobbyFloor).toBeDefined();

    const lobbyNodes = await db
      .select()
      .from(interactiveNodes)
      .where(eq(interactiveNodes.floorId, lobbyFloor!.id));

    expect(lobbyNodes.length).toBe(2);
    const nodeTypes = lobbyNodes.map((n) => n.nodeType).sort();
    expect(nodeTypes).toEqual(['portal', 'receptionist_npc']);

    const aria = lobbyNodes.find((n) => n.id === 'node-reception-desk');
    expect(aria).toBeDefined();
    expect(aria?.name).toBe('Aria (AI Receptionist)');
    expect(aria?.posX).toBe(0);
    expect(aria?.posY).toBe(1.5);
    expect(aria?.posZ).toBe(-5);
  });

  it('has Arena battle pods on Floor 4', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const arenaFloor = await db
      .select()
      .from(floors)
      .where(eq(floors.id, 'floor-inno-4'));

    expect(arenaFloor.length).toBe(1);
    expect(arenaFloor[0].category).toBe('coding_arena');

    const arenaNodes = await db
      .select()
      .from(interactiveNodes)
      .where(eq(interactiveNodes.floorId, 'floor-inno-4'));

    expect(arenaNodes.length).toBe(3);
    const nodeIds = arenaNodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual(['node-arena-pod-1', 'node-arena-pod-2', 'node-arena-whiteboard']);
  });

  it('has SRE lab rack and terminal on Floor 8', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const sreNodes = await db
      .select()
      .from(interactiveNodes)
      .where(eq(interactiveNodes.floorId, 'floor-inno-8'));

    expect(sreNodes.length).toBe(2);
    const nodeTypes = sreNodes.map((n) => n.nodeType).sort();
    expect(nodeTypes).toEqual(['cloud_lab_rack', 'terminal']);
  });
});
