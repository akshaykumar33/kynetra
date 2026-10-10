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
    const [building] = await tx.insert(buildings).values({ name: 'Northgate Hub' }).returning();
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
    return org.id;
  });
}
