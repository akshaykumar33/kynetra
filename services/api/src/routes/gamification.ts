import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { worldState } from '../data/world-state.js';

export async function gamificationRoutes(app: FastifyInstance) {
  // Get world leaderboard
  app.get('/api/v1/gamification/leaderboard', async () => {
    const leaderboard = worldState.getLeaderboard();
    return {
      leaderboard,
      totalRanked: leaderboard.length,
    };
  });

  // Get user profile
  app.get(
    '/api/v1/gamification/profile/:handle',
    async (request: FastifyRequest<{ Params: { handle: string } }>, reply: FastifyReply) => {
      const { handle } = request.params;
      const profile = worldState.getGamificationProfile(handle);
      return reply.status(200).send(profile);
    }
  );
}
