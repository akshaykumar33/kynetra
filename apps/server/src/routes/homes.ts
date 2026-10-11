import { canEnter, HomeDecorSchema, NoteSchema, NOTES_PER_HOUR, readDecor, type HomeDecor } from '@kynetra/shared';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { SessionUser } from '../auth/sessions';
import type { Db } from '../db/client';
import { homeInvites, homeNotes, homes, users } from '../db/schema';
import { requireUser } from '../http/access';
import { AppError, notFound } from '../http/errors';
import { ensureHome } from '../world/homes';

const OwnerParams = z.object({ ownerId: z.string().uuid() });
const UpdateHomeSchema = z
  .object({
    open: z.boolean().optional(),
    name: z.string().trim().min(1).max(40).optional(),
    decor: HomeDecorSchema.optional(),
  })
  .strict();

/** Notes shown in a guestbook: the newest ones, enough to fill the wall. */
const GUESTBOOK_SIZE = 30;

export interface HomeView {
  home: { ownerId: string; name: string; open: boolean; decor: HomeDecor };
  owner: { name: string };
  /** How you are here: the owner, or a guest (invited, or the door is open). */
  as: 'owner' | 'guest';
  notes: { id: string; author: string; text: string; createdAt: string; mine: boolean; canDelete: boolean }[];
  /** Only for the owner: who may come in while the door is closed. */
  guests: { id: string; name: string }[] | null;
}

/**
 * Lets a person into a home, or refuses, through the shared canEnter rule. A closed home you are
 * not invited to answers 403 with code private_home, so the app can say "knock first" rather than
 * pretend the house is not there (everyone can see it on the street anyway).
 */
async function enterHome(db: Db, user: SessionUser, ownerId: string) {
  const [home] = await db.select().from(homes).where(eq(homes.ownerId, ownerId));
  if (!home) throw notFound('No home here');
  const [invite] = await db
    .select()
    .from(homeInvites)
    .where(and(eq(homeInvites.ownerId, ownerId), eq(homeInvites.guestId, user.id)));
  const entry = canEnter(
    { userId: user.id, memberships: [], invitedHomes: invite ? [ownerId] : [] },
    { district: 'residential', homeOwnerId: ownerId, homeOpen: home.open },
  );
  if (!entry.allowed) throw new AppError(403, 'private_home', 'This home is private. Its owner can invite you in.');
  return { home, as: entry.as === 'owner' ? ('owner' as const) : ('guest' as const) };
}

async function myHome(db: Db, req: FastifyRequest) {
  const user = await requireUser(db, req);
  const home = await ensureHome(db, user.id, user.name);
  return { user, home };
}

export function registerHomeRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/v1/homes/:ownerId', async (req): Promise<HomeView> => {
    const { ownerId } = OwnerParams.parse(req.params);
    const user = await requireUser(db, req);
    const { home, as } = await enterHome(db, user, ownerId);

    const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, ownerId));
    const notes = await db
      .select({
        id: homeNotes.id,
        authorId: homeNotes.authorId,
        author: users.name,
        text: homeNotes.text,
        createdAt: homeNotes.createdAt,
      })
      .from(homeNotes)
      .innerJoin(users, eq(users.id, homeNotes.authorId))
      .where(and(eq(homeNotes.homeOwnerId, ownerId), isNull(users.deletedAt)))
      .orderBy(desc(homeNotes.createdAt))
      .limit(GUESTBOOK_SIZE);
    const guests =
      as === 'owner'
        ? await db
            .select({ id: users.id, name: users.name })
            .from(homeInvites)
            .innerJoin(users, eq(users.id, homeInvites.guestId))
            .where(eq(homeInvites.ownerId, ownerId))
            .orderBy(users.name)
        : null;

    return {
      home: { ownerId, name: home.name, open: home.open, decor: readDecor(home.decor) },
      owner: { name: owner?.name ?? 'Someone' },
      as,
      notes: notes.map(n => ({
        id: n.id,
        author: n.author,
        text: n.text,
        createdAt: n.createdAt.toISOString(),
        mine: n.authorId === user.id,
        canDelete: n.authorId === user.id || as === 'owner',
      })),
      guests,
    };
  });

  /** Your own home: open or close the door, rename it, redecorate. */
  app.patch('/api/v1/homes/mine', async req => {
    const { user } = await myHome(db, req);
    const body = UpdateHomeSchema.parse(req.body);
    const patch: Partial<typeof homes.$inferInsert> = {};
    if (body.open !== undefined) patch.open = body.open;
    if (body.name !== undefined) patch.name = body.name;
    if (body.decor !== undefined) patch.decor = readDecor(body.decor);
    if (Object.keys(patch).length) await db.update(homes).set(patch).where(eq(homes.ownerId, user.id));
    return { ok: true };
  });

  /**
   * Invite someone by email. The answer is the same whether or not that email has an account, so
   * this can't be used to find out who uses Kynetra.
   */
  app.post('/api/v1/homes/mine/guests', async req => {
    const { user } = await myHome(db, req);
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
    const [guest] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));
    if (guest && guest.id !== user.id)
      await db.insert(homeInvites).values({ ownerId: user.id, guestId: guest.id }).onConflictDoNothing();
    return { ok: true };
  });

  app.delete('/api/v1/homes/mine/guests/:guestId', async req => {
    const { user } = await myHome(db, req);
    const { guestId } = z.object({ guestId: z.string().uuid() }).parse(req.params);
    await db.delete(homeInvites).where(and(eq(homeInvites.ownerId, user.id), eq(homeInvites.guestId, guestId)));
    return { ok: true };
  });

  /** Leave a note in the guestbook of a home you are allowed into. */
  app.post('/api/v1/homes/:ownerId/notes', async (req, reply) => {
    const { ownerId } = OwnerParams.parse(req.params);
    const user = await requireUser(db, req);
    await enterHome(db, user, ownerId);
    const { text } = NoteSchema.parse(req.body);
    const [{ recent }] = await db
      .select({ recent: count() })
      .from(homeNotes)
      .where(
        and(
          eq(homeNotes.homeOwnerId, ownerId),
          eq(homeNotes.authorId, user.id),
          gt(homeNotes.createdAt, new Date(Date.now() - 3600_000)),
        ),
      );
    if (recent >= NOTES_PER_HOUR)
      throw new AppError(429, 'rate_limited', 'That is plenty of notes for now. Try again in a while.');
    const [note] = await db
      .insert(homeNotes)
      .values({ homeOwnerId: ownerId, authorId: user.id, text })
      .returning({ id: homeNotes.id });
    return reply.status(201).send({ id: note.id });
  });

  /** The home's owner can tidy the guestbook; an author can take back their own note. */
  app.delete('/api/v1/homes/:ownerId/notes/:noteId', async req => {
    const { ownerId, noteId } = z.object({ ownerId: z.string().uuid(), noteId: z.string().uuid() }).parse(req.params);
    const user = await requireUser(db, req);
    const [note] = await db
      .select()
      .from(homeNotes)
      .where(and(eq(homeNotes.id, noteId), eq(homeNotes.homeOwnerId, ownerId)));
    if (!note || (note.authorId !== user.id && ownerId !== user.id)) throw notFound('No such note');
    await db.delete(homeNotes).where(eq(homeNotes.id, noteId));
    return { ok: true };
  });
}
