import { homeLot, type WorldMap } from '@kynetra/shared';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/client';
import { buildings, floors, homes, leases, memberships, organizations, teams } from '../db/schema';
import { requireUser } from '../http/access';
import { ensureHome } from '../world/homes';

export function registerWorldRoutes(app: FastifyInstance, db: Db) {
  /**
   * The whole world as one signed-in person sees it: every building with its tenants' names, every
   * home on the street, and where this person belongs — their home, each org, team and office.
   * Not org-scoped: a person with no org still has a world to stand in.
   */
  app.get('/api/v1/world', async (req): Promise<WorldMap> => {
    const user = await requireUser(db, req);
    await ensureHome(db, user.id, user.name);

    const rows = await db
      .select({ building: buildings, level: floors.level, orgId: organizations.id, org: organizations.name })
      .from(buildings)
      .leftJoin(floors, eq(floors.buildingId, buildings.id))
      .leftJoin(leases, eq(leases.floorId, floors.id))
      .leftJoin(organizations, eq(organizations.id, leases.orgId))
      .orderBy(buildings.name, floors.level);

    const byId = new Map<string, WorldMap['buildings'][number]>();
    const officeOf = new Map<string, { buildingId: string; level: number }>();
    for (const r of rows) {
      const b = r.building;
      if (!byId.has(b.id))
        byId.set(b.id, {
          id: b.id,
          name: b.name,
          district: b.district,
          x: b.campusX,
          z: b.campusZ,
          width: b.width,
          depth: b.depth,
          levels: b.levels,
          color: b.color,
          tenants: [],
        });
      if (r.level === null || !r.orgId || !r.org) continue;
      byId.get(b.id)!.tenants.push({ level: r.level, orgId: r.orgId, name: r.org });
      if (!officeOf.has(r.orgId)) officeOf.set(r.orgId, { buildingId: b.id, level: r.level });
    }

    const homeRows = await db.select().from(homes).orderBy(homes.lot);
    const mine = await db
      .select({
        orgId: memberships.orgId,
        role: memberships.role,
        teamId: memberships.teamId,
        name: organizations.name,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(eq(memberships.userId, user.id))
      .orderBy(organizations.name);
    const teamIds = mine.map(m => m.teamId).filter((t): t is string => t !== null);
    const teamRows = teamIds.length ? await db.select().from(teams).where(inArray(teams.id, teamIds)) : [];

    return {
      name: 'Kynetra',
      buildings: [...byId.values()],
      homes: homeRows.map(h => {
        const [x, z] = homeLot(h.lot);
        return { ownerId: h.ownerId, name: h.name, x, z, mine: h.ownerId === user.id, open: h.open };
      }),
      you: {
        userId: user.id,
        name: user.name,
        orgs: mine.map(m => {
          const team = teamRows.find(t => t.id === m.teamId);
          return {
            orgId: m.orgId,
            name: m.name,
            role: m.role,
            team: team ? { key: team.key, name: team.name } : null,
            office: officeOf.get(m.orgId) ?? null,
          };
        }),
      },
    };
  });
}
