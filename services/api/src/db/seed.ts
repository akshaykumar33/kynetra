import { db, pool } from './client.js';
import {
  organizations,
  users,
  tenantMemberships,
  districts,
  buildings,
  floors,
  interactiveNodes,
} from './schema.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

export async function seed(): Promise<void> {
  console.log('[Seed] Starting database seeding for Kynetra...');

  // 1. Seed Organization
  const orgId = 'a0000000-0000-4000-8000-000000000001';
  console.log('[Seed] Seeding organizations...');
  await db
    .insert(organizations)
    .values({
      id: orgId,
      name: 'Kynetra Foundation',
      slug: 'kynetra-foundation',
      domain: 'kynetra.dev',
      subscriptionTier: 'enterprise',
      avatarUrl: 'https://assets.kynetra.dev/orgs/foundation.svg',
    })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: {
        name: 'Kynetra Foundation',
        domain: 'kynetra.dev',
        subscriptionTier: 'enterprise',
        updatedAt: new Date(),
      },
    });

  // 2. Seed System Users & Roles
  console.log('[Seed] Seeding users...');
  const seedUsers = [
    {
      id: 'usr_admin_01',
      email: 'admin@kynetra.dev',
      passwordHash: '$2a$12$e8Yk2uRz0N9b4J1q2w3e4u5i6o7p8a9s0d1f2g3h4j5k6l7z8x9c0',
      handle: 'admin',
      displayName: 'Platform Administrator',
      role: 'admin',
      xp: 1000,
      currentDistrictId: 'kynetra-central',
      statusMessage: 'Overseeing Kynetra core infrastructure',
    },
    {
      id: 'usr_arch_01',
      email: 'architect@kynetra.dev',
      passwordHash: '$2a$12$e8Yk2uRz0N9b4J1q2w3e4u5i6o7p8a9s0d1f2g3h4j5k6l7z8x9c0',
      handle: 'architect',
      displayName: 'Chief System Architect',
      role: 'architect',
      xp: 750,
      currentDistrictId: 'kynetra-central',
      statusMessage: 'Designing high-throughput topology and systems',
    },
    {
      id: 'usr_emp_01',
      email: 'employee@kynetra.dev',
      passwordHash: '$2a$12$e8Yk2uRz0N9b4J1q2w3e4u5i6o7p8a9s0d1f2g3h4j5k6l7z8x9c0',
      handle: 'employee',
      displayName: 'Staff Software Engineer',
      role: 'employee',
      xp: 500,
      currentDistrictId: 'developer-district',
      statusMessage: 'Developing services and workstation features',
    },
  ];

  for (const u of seedUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: u.email,
          handle: u.handle,
          displayName: u.displayName,
          role: u.role,
          xp: u.xp,
          currentDistrictId: u.currentDistrictId,
          statusMessage: u.statusMessage,
          updatedAt: new Date(),
        },
      });
  }

  // 3. Seed Tenant Memberships
  console.log('[Seed] Seeding tenant memberships...');
  const memberships = [
    { id: 'b0000000-0000-4000-8000-000000000001', organizationId: orgId, userId: 'usr_admin_01', role: 'owner' },
    { id: 'b0000000-0000-4000-8000-000000000002', organizationId: orgId, userId: 'usr_arch_01', role: 'admin' },
    { id: 'b0000000-0000-4000-8000-000000000003', organizationId: orgId, userId: 'usr_emp_01', role: 'member' },
  ];

  for (const m of memberships) {
    await db
      .insert(tenantMemberships)
      .values(m)
      .onConflictDoUpdate({
        target: tenantMemberships.id,
        set: {
          role: m.role,
        },
      });
  }

  // 4. Seed Canonical Districts
  console.log('[Seed] Seeding districts...');
  const seedDistricts = [
    {
      id: 'kynetra-central',
      name: 'Kynetra Central',
      theme: 'Civic & Headquarters',
      description: 'The civic core of Kynetra. Features Central Plaza, civic forums, and the Innovation Tower.',
      coordX: 0,
      coordY: 0,
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Innovation Tower',
    },
    {
      id: 'developer-district',
      name: 'Developer District',
      theme: 'Open Source & Tooling',
      description: 'Home to collaborative open-source guilds, compiler workshops, and hackathons.',
      coordX: 250,
      coordY: 50,
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Open Source Guild Hall',
    },
    {
      id: 'ai-research-district',
      name: 'AI Research District',
      theme: 'Intelligence & Simulation',
      description: 'Neural training clusters, agent laboratories, and synthetic personality testing grounds.',
      coordX: -180,
      coordY: 220,
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Neural Foundry',
    },
    {
      id: 'cybersecurity-district',
      name: 'Cybersecurity District',
      theme: 'Defense & Offense Simulation',
      description: 'Red team/blue team battlegrounds, vulnerability ranges, and forensic sandbox chambers.',
      coordX: -300,
      coordY: -150,
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Zero Trust Citadel',
    },
  ];

  for (const d of seedDistricts) {
    await db
      .insert(districts)
      .values(d)
      .onConflictDoUpdate({
        target: districts.id,
        set: {
          name: d.name,
          theme: d.theme,
          description: d.description,
          coordX: d.coordX,
          coordY: d.coordY,
          status: d.status,
          keyLandmark: d.keyLandmark,
        },
      });
  }

  // 5. Seed Buildings
  console.log('[Seed] Seeding buildings...');
  const seedBuildings = [
    {
      id: 'building-innovation-tower',
      districtId: 'kynetra-central',
      campusId: 'campus-hq',
      name: 'Innovation Tower',
      code: 'INNO',
      totalFloors: 10,
    },
    {
      id: 'building-dev-guild',
      districtId: 'developer-district',
      campusId: 'campus-foss',
      name: 'Open Source Guild Hall',
      code: 'GUILD',
      totalFloors: 3,
    },
    {
      id: 'building-ai-foundry',
      districtId: 'ai-research-district',
      campusId: 'campus-neural',
      name: 'Neural Foundry',
      code: 'NEUR',
      totalFloors: 4,
    },
    {
      id: 'building-sec-citadel',
      districtId: 'cybersecurity-district',
      campusId: 'campus-zero-trust',
      name: 'Zero Trust Citadel',
      code: 'CITL',
      totalFloors: 5,
    },
  ];

  for (const b of seedBuildings) {
    await db
      .insert(buildings)
      .values(b)
      .onConflictDoUpdate({
        target: buildings.id,
        set: {
          name: b.name,
          code: b.code,
          totalFloors: b.totalFloors,
        },
      });
  }

  // 6. Seed Floors
  console.log('[Seed] Seeding floors...');
  const seedFloors = [
    // Innovation Tower
    {
      id: 'floor-inno-1',
      buildingId: 'building-innovation-tower',
      floorNumber: 1,
      name: 'Lobby & Reception',
      category: 'lobby',
      description: 'Grand reception concourse with AI Receptionist and fast-travel portals.',
      capacity: 250,
      currentOccupancy: 0,
    },
    {
      id: 'floor-inno-4',
      buildingId: 'building-innovation-tower',
      floorNumber: 4,
      name: 'Algorithmic Coding Arena',
      category: 'coding_arena',
      description: 'High-stakes multiplayer coding pods with live test harness evaluation.',
      capacity: 100,
      currentOccupancy: 0,
    },
    {
      id: 'floor-inno-8',
      buildingId: 'building-innovation-tower',
      floorNumber: 8,
      name: 'Cloud Infrastructure & SRE Lab',
      category: 'cloud_lab',
      description: 'Interactive server racks, live telemetry boards, and simulated outages.',
      capacity: 80,
      currentOccupancy: 0,
    },
    // Developer District
    {
      id: 'floor-dev-1',
      buildingId: 'building-dev-guild',
      floorNumber: 1,
      name: 'Guild Hall Commons',
      category: 'workspace',
      description: 'Open collaborative hall for distributed project maintainers.',
      capacity: 150,
      currentOccupancy: 0,
    },
    {
      id: 'floor-dev-2',
      buildingId: 'building-dev-guild',
      floorNumber: 2,
      name: 'Compiler & Runtime Workshop',
      category: 'workspace',
      description: 'Low-level benchmarking suites, WebAssembly runtimes, and JIT compilers.',
      capacity: 80,
      currentOccupancy: 0,
    },
    // AI Research District
    {
      id: 'floor-ai-1',
      buildingId: 'building-ai-foundry',
      floorNumber: 1,
      name: 'Neural Foundry Concourse',
      category: 'workspace',
      description: 'Central AI research forum with model checkpoint evaluation pods.',
      capacity: 120,
      currentOccupancy: 0,
    },
    // Cybersecurity District
    {
      id: 'floor-sec-1',
      buildingId: 'building-sec-citadel',
      floorNumber: 1,
      name: 'Security Operations Center (SOC)',
      category: 'workspace',
      description: 'Live SIEM threat intelligence boards and intrusion alerts.',
      capacity: 100,
      currentOccupancy: 0,
    },
  ];

  for (const f of seedFloors) {
    await db
      .insert(floors)
      .values(f)
      .onConflictDoUpdate({
        target: floors.id,
        set: {
          name: f.name,
          category: f.category,
          description: f.description,
          capacity: f.capacity,
          currentOccupancy: f.currentOccupancy,
        },
      });
  }

  // 7. Seed Interactive Workstation Nodes
  console.log('[Seed] Seeding interactive nodes...');
  const seedNodes = [
    // Innovation Tower Floor 1
    {
      id: 'node-reception-desk',
      floorId: 'floor-inno-1',
      name: 'Aria (AI Receptionist)',
      nodeType: 'receptionist_npc',
      posX: 0,
      posY: 1.5,
      posZ: -5,
      description: 'Intelligent concierge guiding developers to floors and arenas.',
      activeSessionCount: 0,
    },
    {
      id: 'node-portal-arena',
      floorId: 'floor-inno-1',
      name: 'Arena Fast Portal',
      nodeType: 'portal',
      posX: 10,
      posY: 1,
      posZ: -2,
      description: 'Direct transit to Coding Arena on Floor 4.',
      activeSessionCount: 0,
    },
    // Innovation Tower Floor 4
    {
      id: 'node-arena-pod-1',
      floorId: 'floor-inno-4',
      name: 'Battle Pod Alpha',
      nodeType: 'coding_pod',
      posX: -8,
      posY: 1,
      posZ: 4,
      description: 'Competitive dual-terminal coding pod with automated test runner.',
      activeSessionCount: 0,
    },
    {
      id: 'node-arena-pod-2',
      floorId: 'floor-inno-4',
      name: 'Battle Pod Beta',
      nodeType: 'coding_pod',
      posX: 8,
      posY: 1,
      posZ: 4,
      description: 'Real-time algorithm competition station with telemetry display.',
      activeSessionCount: 0,
    },
    {
      id: 'node-arena-whiteboard',
      floorId: 'floor-inno-4',
      name: 'System Architecture Board',
      nodeType: 'whiteboard',
      posX: 0,
      posY: 2,
      posZ: 8,
      description: 'Collaborative real-time diagramming canvas.',
      activeSessionCount: 0,
    },
    // Innovation Tower Floor 8
    {
      id: 'node-cloud-rack-01',
      floorId: 'floor-inno-8',
      name: 'Simulated Kubernetes Cluster Rack',
      nodeType: 'cloud_lab_rack',
      posX: 6,
      posY: 1.5,
      posZ: 0,
      description: 'Physical cluster replica with live circuit breaker controls.',
      activeSessionCount: 0,
    },
    {
      id: 'node-sre-terminal',
      floorId: 'floor-inno-8',
      name: 'NOC Incident Response Terminal',
      nodeType: 'terminal',
      posX: -6,
      posY: 1,
      posZ: 0,
      description: 'Real-time observability console and chaos engineering triggers.',
      activeSessionCount: 0,
    },
    // Developer District Floor 1
    {
      id: 'node-dev-collab-1',
      floorId: 'floor-dev-1',
      name: 'Git Contributor Workstation',
      nodeType: 'terminal',
      posX: -4,
      posY: 1,
      posZ: 0,
      description: 'Code review hub and monorepo build runner.',
      activeSessionCount: 0,
    },
    {
      id: 'node-dev-registry',
      floorId: 'floor-dev-1',
      name: 'Package Registry Mirror',
      nodeType: 'cloud_lab_rack',
      posX: 4,
      posY: 1,
      posZ: 2,
      description: 'Artifact caching node with dependency vulnerability scanner.',
      activeSessionCount: 0,
    },
    // Developer District Floor 2
    {
      id: 'node-compiler-bench',
      floorId: 'floor-dev-2',
      name: 'Rust Toolchain Bench',
      nodeType: 'terminal',
      posX: 0,
      posY: 1,
      posZ: -3,
      description: 'High-concurrency compilation runner with micro-benchmarks.',
      activeSessionCount: 0,
    },
    // AI Research District Floor 1
    {
      id: 'node-ai-evaluator',
      floorId: 'floor-ai-1',
      name: 'Model Benchmark Pod',
      nodeType: 'terminal',
      posX: -5,
      posY: 1,
      posZ: 2,
      description: 'Autonomous LLM evaluation and latency profiler.',
      activeSessionCount: 0,
    },
    {
      id: 'node-vector-cluster',
      floorId: 'floor-ai-1',
      name: 'pgvector Index Cluster',
      nodeType: 'cloud_lab_rack',
      posX: 5,
      posY: 1.5,
      posZ: -2,
      description: 'High-dimension vector search engine with RAG telemetry.',
      activeSessionCount: 0,
    },
    // Cybersecurity District Floor 1
    {
      id: 'node-soc-console',
      floorId: 'floor-sec-1',
      name: 'SOC Threat Defense Console',
      nodeType: 'terminal',
      posX: -4,
      posY: 1,
      posZ: 0,
      description: 'SIEM anomaly detector and firewall rule validator.',
      activeSessionCount: 0,
    },
    {
      id: 'node-honeynet-rack',
      floorId: 'floor-sec-1',
      name: 'Honeypot Sandbox Cluster',
      nodeType: 'cloud_lab_rack',
      posX: 4,
      posY: 1.5,
      posZ: 1,
      description: 'Isolated decoy environment capturing simulated cyber attacks.',
      activeSessionCount: 0,
    },
  ];

  for (const n of seedNodes) {
    await db
      .insert(interactiveNodes)
      .values(n)
      .onConflictDoUpdate({
        target: interactiveNodes.id,
        set: {
          name: n.name,
          nodeType: n.nodeType,
          posX: n.posX,
          posY: n.posY,
          posZ: n.posZ,
          description: n.description,
          activeSessionCount: n.activeSessionCount,
        },
      });
  }

  console.log('[Seed] Database seeding completed successfully.');
}

// Auto-run if executed directly
if (process.argv[1] === __filename) {
  seed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Database seeding failed:', err);
      await pool.end();
      process.exit(1);
    });
}
