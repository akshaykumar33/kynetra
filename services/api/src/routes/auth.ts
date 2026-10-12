import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import { LoginRequestSchema } from '@kynetra/contracts';

export async function authRoutes(app: FastifyInstance) {
  // Login endpoint: Authenticate against PostgreSQL users table
  app.post('/api/v1/auth/login', async (request, reply) => {
    const parse = LoginRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Invalid login payload',
        details: parse.error.issues,
      });
    }

    const { identifier, password } = parse.data;

    // Search user by email or handle
    const results = await db
      .select({
        id: users.id,
        email: users.email,
        handle: users.handle,
        displayName: users.displayName,
        role: users.role,
        xp: users.xp,
        statusMessage: users.statusMessage,
        currentDistrictId: users.currentDistrictId,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.handle, identifier)))
      .limit(1);

    if (results.length === 0) {
      return reply.status(401).send({
        error: `Invalid credentials. No user matching '${identifier}' found in database.`,
      });
    }

    const matchedUser = results[0];

    if (!password || password.trim().length === 0) {
      return reply.status(401).send({
        error: 'Password is required.',
      });
    }

    const userProfile = {
      id: matchedUser.id,
      email: matchedUser.email,
      handle: matchedUser.handle,
      displayName: matchedUser.displayName,
      role: (matchedUser.role || 'employee') as 'admin' | 'architect' | 'employee',
      xp: matchedUser.xp,
      statusMessage: matchedUser.statusMessage,
      currentDistrictId: matchedUser.currentDistrictId || 'kynetra-central',
    };

    const token = `kyn.${matchedUser.id}.${Buffer.from(matchedUser.email).toString('base64')}`;

    return reply.status(200).send({
      success: true,
      token,
      user: userProfile,
    });
  });

  // Current session endpoint
  app.get('/api/v1/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const parts = token.split('.');
    if (parts.length < 2 || parts[0] !== 'kyn') {
      return reply.status(401).send({ error: 'Malformed token' });
    }
    const userId = parts[1];

    const results = await db
      .select({
        id: users.id,
        email: users.email,
        handle: users.handle,
        displayName: users.displayName,
        role: users.role,
        xp: users.xp,
        statusMessage: users.statusMessage,
        currentDistrictId: users.currentDistrictId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (results.length === 0) {
      return reply.status(404).send({ error: 'Session user not found' });
    }

    return { user: results[0] };
  });
}
