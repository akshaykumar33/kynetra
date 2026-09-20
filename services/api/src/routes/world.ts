import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { INITIAL_DISTRICTS } from '../data/mock-world.js';

export async function worldRoutes(app: FastifyInstance) {
  app.get('/api/v1/world/districts', async () => {
    return {
      districts: INITIAL_DISTRICTS,
      totalActiveUsers: INITIAL_DISTRICTS.reduce((sum, d) => sum + d.activeUsers, 0),
    };
  });

  app.get(
    '/api/v1/world/districts/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const district = INITIAL_DISTRICTS.find((d) => d.id === id);

      if (!district) {
        return reply.status(404).send({
          type: 'https://kynetra.dev/errors/not-found',
          title: 'District Not Found',
          status: 404,
          detail: `No district found matching ID '${id}'.`,
        });
      }

      return district;
    },
  );
}
