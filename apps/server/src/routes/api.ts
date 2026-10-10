import type { Person } from '@knovra/shared';
import { and, desc, eq, gt, isNotNull, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashToken, newToken } from '../auth/tokens';
import type { Config } from '../config';
import type { Db } from '../db/client';
import {
  deskAssignments,
  floorLayouts,
  floors,
  invites,
  leases,
  memberships,
  organizations,
  teams,
  users,
} from '../db/schema';
import { requireMember, requireUser } from '../http/access';
import { badRequest, conflict, notFound } from '../http/errors';

const OrgParams = z.object({ orgId: z.string().uuid() });
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const AvatarSchema = z.object({ body: hex, skin: hex, hair: hex });

const UpdateMeSchema = z
  .object({
    status: z.enum(['available', 'focus', 'away']),
    workMode: z.enum(['office', 'remote']),
    title: z.string().trim().max(60),
    teamKey: z.string().max(40),
    avatar: AvatarSchema,
    deskKey: z.string().max(40).nullable(),
  })
  .partial()
  .strict(); // unknown fields (role, orgId, ...) are rejected, not silently ignored

const InviteSchema = z.object({
  email: z.string().email().max(200),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

const INVITE_TTL_DAYS = 7;
const DEFAULT_AVATAR = { body: '#2f6f8f', skin: '#d6a07a', hair: '#3a2416' };

/** The org's current lease and its newest published layout. One office per org until Phase 07. */
async function currentOffice(db: Db, orgId: string) {
  const [row] = await db
    .select({ lease: leases, floor: floors, layout: floorLayouts })
    .from(leases)
    .innerJoin(floors, eq(floors.id, leases.floorId))
    .innerJoin(floorLayouts, and(eq(floorLayouts.leaseId, leases.id), isNotNull(floorLayouts.publishedAt)))
    .where(eq(leases.orgId, orgId))
    .orderBy(desc(floorLayouts.version))
    .limit(1);
  return row ?? null;
}

export function registerApiRoutes(app: FastifyInstance, db: Db, config: Config) {
  app.get('/api/v1/me', async req => {
    const user = await requireUser(db, req);
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        role: memberships.role,
        onboardedAt: memberships.onboardedAt,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(eq(memberships.userId, user.id))
      .orderBy(organizations.name);
    return {
      user,
      orgs: orgs.map(o => ({ id: o.id, name: o.name, role: o.role, onboarded: o.onboardedAt !== null })),
    };
  });

  app.get('/api/v1/orgs/:orgId/floor', async req => {
    const { orgId } = OrgParams.parse(req.params);
    const { user } = await requireMember(db, req, orgId);
    const office = await currentOffice(db, orgId);
    if (!office) throw notFound('This organisation has no office yet');

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    const rows = await db
      .select({ user: users, membership: memberships, team: teams, desk: deskAssignments.deskKey })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .leftJoin(teams, eq(teams.id, memberships.teamId))
      .leftJoin(
        deskAssignments,
        and(eq(deskAssignments.userId, memberships.userId), eq(deskAssignments.leaseId, office.lease.id)),
      )
      .where(and(eq(memberships.orgId, orgId), isNull(users.deletedAt)))
      .orderBy(users.name);

    const people: Person[] = rows.map(r => ({
      id: r.user.id,
      name: r.user.name,
      role: r.membership.title,
      team: r.team?.key ?? '',
      where: r.membership.workMode,
      status: r.membership.status,
      ...(r.membership.avatar ?? DEFAULT_AVATAR),
      desk: r.desk ?? '',
    }));
    const teamRows = await db
      .select({ key: teams.key, name: teams.name })
      .from(teams)
      .where(eq(teams.orgId, orgId))
      .orderBy(teams.name);

    return {
      org: { id: org.id, name: org.name },
      floor: { name: office.floor.name, level: office.floor.level, layoutVersion: office.layout.version },
      layout: office.layout.layout,
      teams: teamRows,
      meId: user.id,
      people,
    };
  });

  app.patch('/api/v1/orgs/:orgId/me', async req => {
    const { orgId } = OrgParams.parse(req.params);
    const { user, membership } = await requireMember(db, req, orgId);
    const body = UpdateMeSchema.parse(req.body);

    const patch: Partial<typeof memberships.$inferInsert> = { updatedAt: new Date() };
    if (body.status) patch.status = body.status;
    if (body.workMode) patch.workMode = body.workMode;
    if (body.title !== undefined) patch.title = body.title;
    if (body.avatar) patch.avatar = body.avatar;
    if (body.teamKey !== undefined) {
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.orgId, orgId), eq(teams.key, body.teamKey)));
      if (!team) throw badRequest('That team does not exist');
      patch.teamId = team.id;
    }

    await db.transaction(async tx => {
      if (body.deskKey !== undefined) {
        const office = await currentOffice(tx as unknown as Db, orgId);
        if (!office) throw notFound('This organisation has no office yet');
        await tx
          .delete(deskAssignments)
          .where(and(eq(deskAssignments.leaseId, office.lease.id), eq(deskAssignments.userId, user.id)));
        if (body.deskKey !== null) {
          if (!office.layout.layout.desks.some(d => d.id === body.deskKey))
            throw badRequest('That desk does not exist');
          // the (lease, desk) primary key makes a double booking fail atomically, even under a race
          const taken = await tx
            .insert(deskAssignments)
            .values({ leaseId: office.lease.id, deskKey: body.deskKey, userId: user.id })
            .onConflictDoNothing()
            .returning();
          if (taken.length === 0) throw conflict('Someone already sits at that desk');
        }
      }
      const hasAvatar = body.avatar ?? membership.avatar;
      const hasTeam = patch.teamId ?? membership.teamId;
      if (!membership.onboardedAt && hasAvatar && hasTeam) patch.onboardedAt = new Date();
      await tx
        .update(memberships)
        .set(patch)
        .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, user.id)));
    });
    return { ok: true };
  });

  app.get('/api/v1/orgs/:orgId/invites', async req => {
    const { orgId } = OrgParams.parse(req.params);
    await requireMember(db, req, orgId, ['owner', 'admin']);
    const rows = await db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        expiresAt: invites.expiresAt,
        acceptedAt: invites.acceptedAt,
      })
      .from(invites)
      .where(eq(invites.orgId, orgId))
      .orderBy(desc(invites.createdAt));
    return { invites: rows };
  });

  app.post('/api/v1/orgs/:orgId/invites', async (req, reply) => {
    const { orgId } = OrgParams.parse(req.params);
    const { user } = await requireMember(db, req, orgId, ['owner', 'admin']);
    const body = InviteSchema.parse(req.body);
    const token = newToken();
    const [invite] = await db
      .insert(invites)
      .values({
        orgId,
        email: body.email.toLowerCase(),
        role: body.role,
        tokenHash: hashToken(token),
        invitedBy: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      })
      .returning({ id: invites.id, email: invites.email, role: invites.role, expiresAt: invites.expiresAt });
    // The link is shown once to the admin; only its hash is stored. Email delivery comes later.
    return reply.status(201).send({ invite, link: `${config.APP_ORIGIN}/?invite=${token}` });
  });

  app.post('/api/v1/invites/accept', async req => {
    const user = await requireUser(db, req);
    const { token } = z.object({ token: z.string().min(20).max(100) }).parse(req.body);
    return db.transaction(async tx => {
      const [invite] = await tx
        .select()
        .from(invites)
        .where(
          and(eq(invites.tokenHash, hashToken(token)), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())),
        )
        .limit(1);
      // one message for wrong, used and expired links so tokens can't be probed
      const invalid = badRequest('This invite link is not valid for your account');
      if (!invite || invite.email !== user.email.toLowerCase()) throw invalid;
      // conditional update so the same link can't be redeemed twice concurrently
      const used = await tx
        .update(invites)
        .set({ acceptedAt: new Date() })
        .where(and(eq(invites.id, invite.id), isNull(invites.acceptedAt)))
        .returning();
      if (used.length === 0) throw invalid;
      await tx
        .insert(memberships)
        .values({ orgId: invite.orgId, userId: user.id, role: invite.role })
        .onConflictDoNothing();
      return { orgId: invite.orgId };
    });
  });
}
