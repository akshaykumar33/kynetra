import { count, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { homes } from '../db/schema';

/**
 * Gives a person their home if they don't have one yet: the next free lot in the residential
 * district. Safe to call on every visit. Two people signing up at once may race for the same lot;
 * the unique index turns that into a retry rather than a shared house.
 */
export async function ensureHome(db: Db, ownerId: string, ownerName: string, open = false) {
  const [existing] = await db.select().from(homes).where(eq(homes.ownerId, ownerId));
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ n }] = await db.select({ n: count() }).from(homes);
    const [row] = await db
      .insert(homes)
      .values({ ownerId, name: `${ownerName.split(' ')[0]}'s home`, lot: n + attempt, open })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const [mine] = await db.select().from(homes).where(eq(homes.ownerId, ownerId));
    if (mine) return mine;
  }
  throw new Error('no free home lot');
}
