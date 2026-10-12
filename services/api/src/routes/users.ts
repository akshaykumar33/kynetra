import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { users, tenantMemberships, organizations } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
} from '@kynetra/contracts';

export async function userAdminRoutes(app: FastifyInstance) {
  // 1. List all real users from the PostgreSQL database
  app.get('/api/v1/admin/users', async () => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        handle: users.handle,
        displayName: users.displayName,
        role: users.role,
        xp: users.xp,
        currentDistrictId: users.currentDistrictId,
        statusMessage: users.statusMessage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return { users: allUsers };
  });

  // 2. Create a new real user in the database
  app.post('/api/v1/admin/users', async (request, reply) => {
    const parse = CreateUserRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Invalid user creation payload',
        details: parse.error.issues,
      });
    }

    const { email, handle, displayName, role, xp, currentDistrictId, statusMessage } = parse.data;

    // Check unique handle or email
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({ error: `User with email '${email}' already exists.` });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const [createdUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        handle,
        displayName,
        role,
        passwordHash: '$2a$12$defaultHashedPasswordForDevEnvironment1234567890',
        xp: xp || 0,
        currentDistrictId: currentDistrictId || 'kynetra-central',
        statusMessage: statusMessage || 'Ready for engineering tasks',
      })
      .returning();

    // Link user to Kynetra Foundation organization
    const orgs = await db.select().from(organizations).limit(1);
    if (orgs.length > 0) {
      await db.insert(tenantMemberships).values({
        organizationId: orgs[0].id,
        userId: createdUser.id,
        role: role === 'admin' ? 'admin' : 'member',
      });
    }

    return reply.status(201).send({
      success: true,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        handle: createdUser.handle,
        displayName: createdUser.displayName,
        role: createdUser.role,
        xp: createdUser.xp,
        currentDistrictId: createdUser.currentDistrictId,
        statusMessage: createdUser.statusMessage,
        createdAt: createdUser.createdAt,
      },
    });
  });

  // 3. Update an existing user's role, status, or XP
  app.put<{ Params: { id: string } }>('/api/v1/admin/users/:id', async (request, reply) => {
    const { id } = request.params;
    const parse = UpdateUserRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Invalid update payload',
        details: parse.error.issues,
      });
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (existing.length === 0) {
      return reply.status(404).send({ error: `User with id '${id}' not found.` });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (parse.data.displayName !== undefined) updates.displayName = parse.data.displayName;
    if (parse.data.role !== undefined) updates.role = parse.data.role;
    if (parse.data.xp !== undefined) updates.xp = parse.data.xp;
    if (parse.data.currentDistrictId !== undefined) updates.currentDistrictId = parse.data.currentDistrictId;
    if (parse.data.statusMessage !== undefined) updates.statusMessage = parse.data.statusMessage;

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        handle: updatedUser.handle,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        xp: updatedUser.xp,
        currentDistrictId: updatedUser.currentDistrictId,
        statusMessage: updatedUser.statusMessage,
        updatedAt: updatedUser.updatedAt,
      },
    };
  });

  // 4. Delete a user
  app.delete<{ Params: { id: string } }>('/api/v1/admin/users/:id', async (request, reply) => {
    const { id } = request.params;

    // Safety check: protect primary platform administrator
    if (id === 'usr_admin_01') {
      return reply.status(403).send({ error: 'Cannot delete primary root administrator.' });
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (existing.length === 0) {
      return reply.status(404).send({ error: `User with id '${id}' not found.` });
    }

    await db.delete(users).where(eq(users.id, id));

    return {
      success: true,
      message: `User '${id}' deleted successfully.`,
      deletedId: id,
    };
  });
}
