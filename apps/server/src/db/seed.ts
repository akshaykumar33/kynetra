import { northgateFloor } from '@knovra/shared';
import { eq } from 'drizzle-orm';
import type { Db } from './client';
import {
  buildings,
  deskAssignments,
  floorLayouts,
  floors,
  leases,
  memberships,
  organizations,
  teams,
  users,
} from './schema';

// The demo office from the prototype. Colleagues sign in with the dev login using these emails.
const COLLEAGUES = [
  {
    email: 'asha@northgate.test',
    name: 'Asha Rao',
    title: 'Eng manager',
    team: 'platform',
    workMode: 'remote',
    status: 'meeting',
    avatar: { body: '#4f7cac', skin: '#c68b62', hair: '#2b1d16' },
    desk: 'platform-0',
    role: 'admin',
  },
  {
    email: 'tomas@northgate.test',
    name: 'Tomás Ortega',
    title: 'Backend',
    team: 'platform',
    workMode: 'office',
    status: 'available',
    avatar: { body: '#e07a5f', skin: '#e2b48f', hair: '#4a3222' },
    desk: 'platform-1',
  },
  {
    email: 'mei@northgate.test',
    name: 'Mei Lin',
    title: 'SRE',
    team: 'platform',
    workMode: 'remote',
    status: 'focus',
    avatar: { body: '#3d8a7a', skin: '#efc9a4', hair: '#151515' },
    desk: 'platform-2',
  },
  {
    email: 'kofi@northgate.test',
    name: 'Kofi Mensah',
    title: 'Backend',
    team: 'platform',
    workMode: 'remote',
    status: 'meeting',
    avatar: { body: '#8d6cab', skin: '#7a4b2f', hair: '#120c08' },
    desk: 'platform-3',
  },
  {
    email: 'lena@northgate.test',
    name: 'Lena Fischer',
    title: 'Product designer',
    team: 'design',
    workMode: 'office',
    status: 'available',
    avatar: { body: '#d9a441', skin: '#f1cfb1', hair: '#b07a3c' },
    desk: 'design-0',
    role: 'owner',
  },
  {
    email: 'arjun@northgate.test',
    name: 'Arjun Nair',
    title: 'UX research',
    team: 'design',
    workMode: 'remote',
    status: 'available',
    avatar: { body: '#5b8f4e', skin: '#a8704a', hair: '#1b1411' },
    desk: 'design-1',
  },
  {
    email: 'sofia@northgate.test',
    name: 'Sofia Costa',
    title: 'Brand',
    team: 'design',
    workMode: 'remote',
    status: 'away',
    avatar: { body: '#c45d7a', skin: '#d9a27c', hair: '#5a2e1c' },
    desk: 'design-2',
  },
  {
    email: 'noah@northgate.test',
    name: 'Noah Kim',
    title: 'Support lead',
    team: 'support',
    workMode: 'office',
    status: 'available',
    avatar: { body: '#4a6fa5', skin: '#ecc19c', hair: '#202020' },
    desk: 'support-0',
  },
  {
    email: 'priya@northgate.test',
    name: 'Priya Shah',
    title: 'Support',
    team: 'support',
    workMode: 'remote',
    status: 'available',
    avatar: { body: '#b5654d', skin: '#b67c56', hair: '#1a110c' },
    desk: 'support-1',
  },
  {
    email: 'ola@northgate.test',
    name: 'Ola Nowak',
    title: 'Support',
    team: 'support',
    workMode: 'remote',
    status: 'focus',
    avatar: { body: '#6b8f9c', skin: '#f3d3b8', hair: '#c9a46b' },
    desk: 'support-2',
  },
  {
    email: 'sam@northgate.test',
    name: 'Sam Okafor',
    title: 'Solutions',
    team: 'support',
    workMode: 'office',
    status: 'available',
    avatar: { body: '#9a7b4f', skin: '#6e4329', hair: '#0e0a07' },
    desk: 'support-3',
  },
] as const;

/** A not-yet-onboarded member, for trying the first-run flow. */
export const NEW_MEMBER_EMAIL = 'you@northgate.test';

/** Creates the Northgate demo office. Does nothing if it already exists, so it is safe to rerun. */
export async function seedNorthgate(db: Db) {
  const [existing] = await db.select().from(organizations).where(eq(organizations.slug, 'northgate'));
  if (existing) return existing.id;

  return db.transaction(async tx => {
    const [org] = await tx.insert(organizations).values({ name: 'Northgate', slug: 'northgate' }).returning();
    const [building] = await tx
      .insert(buildings)
      .values({ name: 'Northgate Tower', campusX: 0, campusZ: 0, width: 30, depth: 24, levels: 12, color: '#7fa7c4' })
      .returning();
    const { w, d } = northgateFloor.size;
    const outline: [number, number][] = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ];
    const [floor] = await tx
      .insert(floors)
      .values({ buildingId: building.id, level: 4, name: 'Floor 4', rentableArea: outline })
      .returning();
    const [lease] = await tx.insert(leases).values({ orgId: org.id, floorId: floor.id, area: outline }).returning();
    await tx
      .insert(floorLayouts)
      .values({ leaseId: lease.id, version: 1, layout: northgateFloor, publishedAt: new Date() });

    const teamRows = await tx
      .insert(teams)
      .values([
        { orgId: org.id, key: 'platform', name: 'Platform' },
        { orgId: org.id, key: 'design', name: 'Design' },
        { orgId: org.id, key: 'support', name: 'Support' },
      ])
      .returning();
    const teamId = (key: string) => teamRows.find(t => t.key === key)!.id;

    for (const c of COLLEAGUES) {
      const [user] = await tx.insert(users).values({ email: c.email, name: c.name }).returning();
      await tx.insert(memberships).values({
        orgId: org.id,
        userId: user.id,
        role: 'role' in c ? c.role : 'member',
        title: c.title,
        teamId: teamId(c.team),
        status: c.status,
        workMode: c.workMode,
        avatar: c.avatar,
        onboardedAt: new Date(),
      });
      await tx.insert(deskAssignments).values({ leaseId: lease.id, deskKey: c.desk, userId: user.id });
    }

    const [you] = await tx.insert(users).values({ email: NEW_MEMBER_EMAIL, name: 'Alex Morgan' }).returning();
    await tx.insert(memberships).values({ orgId: org.id, userId: you.id, role: 'member', title: 'Designer' });
    await seedCampus(tx as unknown as Db, building.id);
    return org.id;
  });
}

// The rest of the IT park: towers around a central plaza, with fictional tenant companies so the
// campus directory looks lived in. Tenants have no members; they only appear as names on floors.
const TOWERS = [
  {
    name: 'Helix Tower',
    campusX: -70,
    campusZ: -40,
    width: 26,
    depth: 26,
    levels: 22,
    color: '#9fb8a8',
    tenants: ['Pixel Forge', 'Bluefin Security', 'Lumen Analytics'],
  },
  {
    name: 'Orbit One',
    campusX: 70,
    campusZ: -40,
    width: 34,
    depth: 22,
    levels: 16,
    color: '#c9b79f',
    tenants: ['Acme Cloud', 'Quill Docs'],
  },
  {
    name: 'Quartz Center',
    campusX: -75,
    campusZ: 45,
    width: 40,
    depth: 26,
    levels: 8,
    color: '#b7aec9',
    tenants: ['DataNest', 'Cobalt Robotics', 'Fernway Health', 'Kite Payments'],
  },
  {
    name: 'Meridian Labs',
    campusX: 75,
    campusZ: 45,
    width: 28,
    depth: 28,
    levels: 28,
    color: '#8fa9b8',
    tenants: ['Nimbus AI', 'Tidal Games'],
  },
  {
    name: 'Cedar House',
    campusX: 0,
    campusZ: -95,
    width: 46,
    depth: 20,
    levels: 6,
    color: '#cdb39a',
    tenants: ['Harbor Design Co', 'Sprout Learning'],
  },
];

async function seedCampus(db: Db, northgateBuildingId: string) {
  const outline = (w: number, d: number): [number, number][] => [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];
  // Northgate's tower has other tenants too
  const northgateTenants: [number, string][] = [
    [2, 'Atlas Freight Tech'],
    [7, 'Moss & Pine Studio'],
    [9, 'Vertex Legal Cloud'],
  ];
  for (const [level, name] of northgateTenants) await addTenant(db, northgateBuildingId, level, name, outline(40, 28));

  for (const t of TOWERS) {
    const { tenants, ...tower } = t;
    const [b] = await db.insert(buildings).values(tower).returning();
    for (const [i, name] of tenants.entries()) {
      // spread tenants up the tower
      const level = 1 + Math.round(((i + 1) * (t.levels - 1)) / (tenants.length + 1));
      await addTenant(db, b.id, level, name, outline(40, 28));
    }
  }
}

async function addTenant(db: Db, buildingId: string, level: number, name: string, area: [number, number][]) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [org] = await db.insert(organizations).values({ name, slug }).returning();
  const [floor] = await db
    .insert(floors)
    .values({ buildingId, level, name: `Floor ${level}`, rentableArea: area })
    .returning();
  const [lease] = await db.insert(leases).values({ orgId: org.id, floorId: floor.id, area }).returning();
  await db
    .insert(floorLayouts)
    .values({ leaseId: lease.id, version: 1, layout: northgateFloor, publishedAt: new Date() });
}
