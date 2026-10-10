import websocket from '@fastify/websocket';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { memberships } from '../db/schema';
import { requireMember } from '../http/access';
import { AppError } from '../http/errors';
import { FloorRoom } from './room';

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export async function registerRealtime(app: FastifyInstance, db: Db, config: Config) {
  await app.register(websocket, { options: { maxPayload: 4096 } });
  const rooms = new Map<string, FloorRoom>();

  const roomFor = (orgId: string) => {
    let room = rooms.get(orgId);
    if (!room) {
      room = new FloorRoom({
        graceMs: config.PRESENCE_GRACE_MS,
        saveStatus: (userId, status) =>
          db
            .update(memberships)
            .set({ status, updatedAt: new Date() })
            .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
            .then(() => {}),
        onEmpty: () => rooms.delete(orgId),
      });
      rooms.set(orgId, room);
    }
    return room;
  };

  app.get(
    '/realtime',
    {
      websocket: true,
      // runs before the upgrade, so a refused connection gets a normal HTTP error
      preValidation: async req => {
        // browsers always send Origin on WebSocket upgrades; refusing other origins blocks
        // cross-site WebSocket hijacking with the victim's cookie
        if (req.headers.origin !== config.APP_ORIGIN) throw new AppError(403, 'origin_refused', 'Connection refused');
        const { org } = z.object({ org: z.string().uuid() }).parse(req.query);
        const { user, membership } = await requireMember(db, req, org);
        req.realtime = { orgId: org, userId: user.id, status: membership.status };
      },
    },
    (socket, req) => {
      const { orgId, userId, status } = req.realtime!;
      roomFor(orgId).join(userId, status, socket);
    },
  );

  if (config.NODE_ENV !== 'production') {
    // numbers for the load test; not exposed in production
    app.get('/debug/realtime', async () => {
      const all = [...rooms.values()].flatMap(r => r.tickDurations);
      return {
        rooms: rooms.size,
        members: [...rooms.values()].reduce((n, r) => n + r.size, 0),
        tickMs: { p50: percentile(all, 50), p95: percentile(all, 95), max: Math.max(0, ...all), samples: all.length },
      };
    });
  }

  app.addHook('onClose', async () => {
    for (const r of rooms.values()) r.close();
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    realtime?: { orgId: string; userId: string; status: (typeof memberships.$inferSelect)['status'] };
  }
}
