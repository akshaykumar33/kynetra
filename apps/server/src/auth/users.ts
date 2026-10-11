import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { users } from '../db/schema';

/**
 * Finds the user for a verified identity, creating one on first sign-in. Matching by provider
 * subject first means a changed email at the provider still maps to the same person.
 */
export async function upsertUser(db: Db, input: { email: string; name: string; subject?: string }) {
  const email = input.email.trim().toLowerCase();
  if (input.subject) {
    const [bySubject] = await db.select().from(users).where(eq(users.authSubject, input.subject)).limit(1);
    if (bySubject) return bySubject;
  }
  const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (byEmail) {
    if (input.subject && !byEmail.authSubject)
      await db.update(users).set({ authSubject: input.subject, updatedAt: new Date() }).where(eq(users.id, byEmail.id));
    return byEmail;
  }
  const [created] = await db
    .insert(users)
    .values({ email, name: input.name.trim() || email.split('@')[0], authSubject: input.subject })
    .returning();
  return created;
}
