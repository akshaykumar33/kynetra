import { and, eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { readSession, type SessionUser } from '../auth/sessions';
import type { Db } from '../db/client';
import { memberships } from '../db/schema';
import { forbidden, notFound, unauthorized } from './errors';

type Role = (typeof memberships.$inferSelect)['role'];

export async function requireUser(db: Db, req: FastifyRequest): Promise<SessionUser> {
  const user = await readSession(db, req);
  if (!user) throw unauthorized();
  return user;
}

/**
 * The single place org access is decided. Every org route calls this before touching org data.
 * Non-members get 404 rather than 403 so org ids can't be probed for existence.
 */
export async function requireMember(db: Db, req: FastifyRequest, orgId: string, roles?: Role[]) {
  const user = await requireUser(db, req);
  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, user.id)))
    .limit(1);
  if (!membership) throw notFound('Office not found');
  if (roles && !roles.includes(membership.role)) throw forbidden();
  return { user, membership };
}
