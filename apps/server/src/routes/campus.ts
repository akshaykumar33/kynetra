import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client';
import { buildings, floors, leases, organizations } from '../db/schema';
import { requireMember } from '../http/access';

export function registerCampusRoutes(app: FastifyInstance, db: Db) {
  /**
   * The IT park as a member sees it: every tower, and per floor only the tenant's company name, like
   * the directory board in a real lobby. Which floor is yours decides where you may go.
   */
  app.get('/api/v1/orgs/:orgId/campus', async req => {
    const { orgId } = z.object({ orgId: z.string().uuid() }).parse(req.params);
    await requireMember(db, req, orgId);

    const rows = await db
      .select({ building: buildings, level: floors.level, tenantId: organizations.id, tenant: organizations.name })
      .from(buildings)
      .leftJoin(floors, eq(floors.buildingId, buildings.id))
      .leftJoin(leases, eq(leases.floorId, floors.id))
      .leftJoin(organizations, eq(organizations.id, leases.orgId))
      .orderBy(buildings.name, floors.level);

    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        x: number;
        z: number;
        width: number;
        depth: number;
        levels: number;
        color: string;
        floors: { level: number; tenant: string; mine: boolean }[];
      }
    >();
    let mine: { buildingId: string; level: number } | null = null;
    for (const r of rows) {
      const b = r.building;
      if (!byId.has(b.id))
        byId.set(b.id, {
          id: b.id,
          name: b.name,
          x: b.campusX,
          z: b.campusZ,
          width: b.width,
          depth: b.depth,
          levels: b.levels,
          color: b.color,
          floors: [],
        });
      if (r.level === null || !r.tenant) continue;
      const isMine = r.tenantId === orgId;
      byId.get(b.id)!.floors.push({ level: r.level, tenant: r.tenant, mine: isMine });
      if (isMine) mine = { buildingId: b.id, level: r.level };
    }
    return { name: 'Knovra IT Park', buildings: [...byId.values()], mine };
  });
}
