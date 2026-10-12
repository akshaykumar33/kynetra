import {
  FoundOrgSchema,
  MAX_OWNED_ORGS,
  nextTeamZone,
  slugify,
  starterLayout,
  TEAM_ZONES,
  TeamNameSchema,
  vacantLevels,
} from '@kynetra/shared';
import { and, count, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client';
import { buildings, floorLayouts, floors, leases, memberships, organizations, teams } from '../db/schema';
import { requireMember, requireUser } from '../http/access';
import { badRequest, conflict, notFound } from '../http/errors';
import { currentOffice } from './api';

const OrgParams = z.object({ orgId: z.string().uuid() });

/** Floor outline for a new lease: the starter plan's footprint. */
function outline(): [number, number][] {
  const w = 40;
  const d = 28;
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];
}

/** Publishes a new layout version naming each team's zone; older versions stay as history. */
async function republishLayout(db: Db, orgId: string) {
  const office = await currentOffice(db, orgId);
  if (!office) throw notFound('This organisation has no office yet');
  const teamRows = await db.select({ key: teams.key, name: teams.name }).from(teams).where(eq(teams.orgId, orgId));
  await db.insert(floorLayouts).values({
    leaseId: office.lease.id,
    version: office.layout.version + 1,
    layout: starterLayout(teamRows),
    publishedAt: new Date(),
  });
}

export function registerOrgRoutes(app: FastifyInstance, db: Db) {
  /** Every IT park tower with the floors still free to lease. */
  app.get('/api/v1/vacancies', async req => {
    await requireUser(db, req);
    const rows = await db
      .select({ building: buildings, level: floors.level })
      .from(buildings)
      .leftJoin(floors, eq(floors.buildingId, buildings.id))
      .where(eq(buildings.district, 'business'))
      .orderBy(buildings.name);
    const byId = new Map<string, { id: string; name: string; levels: number; taken: number[] }>();
    for (const r of rows) {
      const b = byId.get(r.building.id) ?? {
        id: r.building.id,
        name: r.building.name,
        levels: r.building.levels,
        taken: [],
      };
      if (r.level !== null) b.taken.push(r.level);
      byId.set(r.building.id, b);
    }
    return {
      buildings: [...byId.values()].map(b => ({
        id: b.id,
        name: b.name,
        levels: b.levels,
        vacant: vacantLevels(b.levels, b.taken),
      })),
    };
  });

  /**
   * Found a company: the org, its lease on a free floor, its first teams and you as owner, all
   * at once, so there is never a company without an office. Two people racing for the same floor
   * hit the unique (building, level) index; the loser gets a 409 and picks another.
   */
  app.post('/api/v1/orgs', async (req, reply) => {
    const user = await requireUser(db, req);
    const body = FoundOrgSchema.parse(req.body);

    const [{ owned }] = await db
      .select({ owned: count() })
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.role, 'owner')));
    if (owned >= MAX_OWNED_ORGS) throw conflict(`You can found up to ${MAX_OWNED_ORGS} companies`);

    const [building] = await db.select().from(buildings).where(eq(buildings.id, body.buildingId));
    if (!building || building.district !== 'business') throw notFound('No such tower');
    if (body.level > building.levels) throw badRequest(`${building.name} has ${building.levels} floors`);

    const area = outline();
    const orgId = await db
      .transaction(async tx => {
        const base = slugify(body.name);
        const [clash] = await tx.select({ n: count() }).from(organizations).where(eq(organizations.slug, base));
        const slug = clash.n ? `${base}-${crypto.randomUUID().slice(0, 6)}` : base;
        const [org] = await tx.insert(organizations).values({ name: body.name, slug }).returning();
        const [floor] = await tx
          .insert(floors)
          .values({ buildingId: building.id, level: body.level, name: `Floor ${body.level}`, rentableArea: area })
          .returning();
        const [lease] = await tx.insert(leases).values({ orgId: org.id, floorId: floor.id, area }).returning();
        const teamRows = await tx
          .insert(teams)
          // teams move into the floor's zones in order
          .values(body.teams.map((name, i) => ({ orgId: org.id, key: TEAM_ZONES[i], name })))
          .returning();
        await tx.insert(floorLayouts).values({
          leaseId: lease.id,
          version: 1,
          layout: starterLayout(teamRows),
          publishedAt: new Date(),
        });
        await tx.insert(memberships).values({ orgId: org.id, userId: user.id, role: 'owner', teamId: teamRows[0].id });
        return org.id;
      })
      .catch((err: unknown) => {
        // the unique (building, level) index: someone else just took this floor
        if (String((err as { cause?: unknown })?.cause ?? err).includes('floor_building_level_idx'))
          throw conflict(`Floor ${body.level} of ${building.name} was just taken. Pick another.`);
        throw err;
      });
    return reply.status(201).send({ orgId });
  });

  /** Add a team; it moves into the next free zone on the floor. */
  app.post('/api/v1/orgs/:orgId/teams', async (req, reply) => {
    const { orgId } = OrgParams.parse(req.params);
    await requireMember(db, req, orgId, ['owner', 'admin']);
    const name = TeamNameSchema.parse((req.body as { name?: unknown } | null)?.name);
    const existing = await db.select().from(teams).where(eq(teams.orgId, orgId));
    if (existing.some(t => t.name.toLowerCase() === name.toLowerCase()))
      throw conflict('There is already a team with that name');
    const key = nextTeamZone(existing.map(t => t.key));
    if (!key) throw conflict('Your floor has room for three teams');
    await db.insert(teams).values({ orgId, key, name });
    await republishLayout(db, orgId);
    return reply.status(201).send({ key });
  });

  app.patch('/api/v1/orgs/:orgId/teams/:key', async req => {
    const { orgId, key } = z.object({ orgId: z.string().uuid(), key: z.string().max(40) }).parse(req.params);
    await requireMember(db, req, orgId, ['owner', 'admin']);
    const name = TeamNameSchema.parse((req.body as { name?: unknown } | null)?.name);
    const others = await db.select().from(teams).where(eq(teams.orgId, orgId));
    if (!others.some(t => t.key === key)) throw notFound('No such team');
    if (others.some(t => t.key !== key && t.name.toLowerCase() === name.toLowerCase()))
      throw conflict('There is already a team with that name');
    await db
      .update(teams)
      .set({ name })
      .where(and(eq(teams.orgId, orgId), eq(teams.key, key)));
    await republishLayout(db, orgId);
    return { ok: true };
  });

  /** The people and teams an owner or admin manages, with each person's role. */
  app.get('/api/v1/orgs/:orgId/manage', async req => {
    const { orgId } = OrgParams.parse(req.params);
    const { membership } = await requireMember(db, req, orgId, ['owner', 'admin']);
    const teamRows = await db
      .select({ key: teams.key, name: teams.name, id: teams.id })
      .from(teams)
      .where(eq(teams.orgId, orgId));
    const counts = teamRows.length
      ? await db
          .select({ teamId: memberships.teamId, n: count() })
          .from(memberships)
          .where(
            and(
              eq(memberships.orgId, orgId),
              inArray(
                memberships.teamId,
                teamRows.map(t => t.id),
              ),
            ),
          )
          .groupBy(memberships.teamId)
      : [];
    const [{ people }] = await db.select({ people: count() }).from(memberships).where(eq(memberships.orgId, orgId));
    return {
      role: membership.role,
      people,
      teams: teamRows
        .map(t => ({ key: t.key, name: t.name, people: counts.find(c => c.teamId === t.id)?.n ?? 0 }))
        .sort((a, b) => a.key.localeCompare(b.key)),
      roomForTeams: nextTeamZone(teamRows.map(t => t.key)) !== null,
    };
  });
}
