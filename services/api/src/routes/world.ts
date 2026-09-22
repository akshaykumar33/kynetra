import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { worldState } from '../data/world-state.js';
import type { InteractiveNode } from '@kynetra/contracts';

export async function worldRoutes(app: FastifyInstance) {
  // District listing
  app.get('/api/v1/world/districts', async () => {
    const districts = worldState.getDistricts();
    const totalActiveUsers = districts.reduce((sum, d) => sum + d.activeUsers, 0);

    return {
      districts,
      totalActiveUsers,
    };
  });

  // District detail
  app.get(
    '/api/v1/world/districts/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const district = worldState.getDistrict(id);

      if (!district) {
        return reply.status(404).send({
          type: 'https://kynetra.dev/errors/not-found',
          title: 'District Not Found',
          status: 404,
          detail: `No district found matching ID '${id}'.`,
        });
      }

      return district;
    }
  );

  // Workstation session connect
  app.post(
    '/api/v1/workstations/:nodeId/connect',
    async (
      request: FastifyRequest<{
        Params: { nodeId: string };
        Body?: { userHandle?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { nodeId } = request.params;
      const userHandle = request.body?.userHandle || 'developer';

      try {
        const result = worldState.connectWorkstation(nodeId, userHandle);
        return reply.status(200).send(result);
      } catch (err: any) {
        return reply.status(404).send({
          type: 'https://kynetra.dev/errors/not-found',
          title: 'Workstation Connect Error',
          status: 404,
          detail: err.message,
        });
      }
    }
  );

  // Workstation session disconnect
  app.post(
    '/api/v1/workstations/:sessionId/disconnect',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const success = worldState.disconnectWorkstation(sessionId);
      return reply.status(200).send({ success, sessionId });
    }
  );

  // Workstation command execution
  app.post(
    '/api/v1/workstations/:nodeId/execute',
    async (
      request: FastifyRequest<{
        Params: { nodeId: string };
        Body: { command: string };
      }>,
      reply: FastifyReply
    ) => {
      const { nodeId } = request.params;
      const { command } = request.body || { command: 'status' };

      const result = worldState.executeWorkstationCommand(nodeId, command);
      return reply.status(200).send(result);
    }
  );

  // Simulation endpoints
  app.get('/api/v1/simulations', async () => {
    return {
      simulations: worldState.getSimulations(),
    };
  });

  app.post(
    '/api/v1/simulations/start',
    async (
      request: FastifyRequest<{
        Body?: { scenarioId?: string; districtId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const scenarioId = request.body?.scenarioId || 'db-starvation';
      const districtId = request.body?.districtId || 'kynetra-central';

      const simulation = worldState.startSimulation(scenarioId, districtId);
      return reply.status(201).send(simulation);
    }
  );

  app.post(
    '/api/v1/simulations/:id/stop',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const success = worldState.stopSimulation(id);
      return reply.status(200).send({ success, id });
    }
  );

  app.post('/api/v1/simulations/clear', async (_request, reply: FastifyReply) => {
    const cleared = worldState.clearAllSimulations();
    return reply.status(200).send({ success: true, cleared });
  });

  app.post(
    '/api/v1/simulations/submit-patch',
    async (
      request: FastifyRequest<{
        Body: {
          simulationId: string;
          userHandle?: string;
          patchConfig?: {
            maxConnections?: number;
            connectionTimeoutMs?: number;
            circuitBreakerEnabled?: boolean;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      const { simulationId, userHandle = 'developer', patchConfig = {} } = request.body;
      const result = worldState.submitPatch(simulationId, userHandle, patchConfig);
      return reply.status(200).send(result);
    }
  );


  // Arena endpoints
  app.get('/api/v1/arena/matches', async () => {
    return {
      matches: worldState.getArenaMatches(),
    };
  });

  app.post(
    '/api/v1/arena/matches/start',
    async (
      request: FastifyRequest<{
        Body?: { title?: string; difficulty?: 'easy' | 'medium' | 'hard'; language?: string };
      }>,
      reply: FastifyReply
    ) => {
      const title = request.body?.title || 'Two Sum & Inverted Indices';
      const difficulty = request.body?.difficulty || 'easy';
      const language = request.body?.language || 'TypeScript';

      const match = worldState.startArenaMatch(title, difficulty, language);
      return reply.status(201).send(match);
    }
  );

  app.post(
    '/api/v1/arena/matches/:id/stop',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const success = worldState.stopArenaMatch(id);
      return reply.status(200).send({ success, id });
    }
  );

  // Deploy dynamic node
  app.post(
    '/api/v1/world/nodes',
    async (
      request: FastifyRequest<{
        Body: {
          districtId: string;
          floorNumber: number;
          name: string;
          nodeType: InteractiveNode['type'];
          description: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { districtId, floorNumber, name, nodeType, description } = request.body;
      try {
        const node = worldState.addNode(districtId, floorNumber, name, nodeType, description);
        return reply.status(201).send(node);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://kynetra.dev/errors/invalid-request',
          title: 'Add Node Error',
          status: 400,
          detail: err.message,
        });
      }
    }
  );
}
