import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { worldState } from '../data/world-state.js';
import { AiChatRequestSchema } from '@kynetra/contracts';

export async function aiRoutes(app: FastifyInstance) {
  app.post(
    '/api/v1/ai/chat',
    async (
      request: FastifyRequest<{
        Body: {
          message: string;
          userHandle?: string;
          contextTopic?: 'general' | 'sre_incident' | 'architecture' | 'onboarding';
          currentFloorNumber?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = AiChatRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          type: 'https://kynetra.dev/errors/validation-error',
          title: 'Invalid AI Chat Request',
          status: 400,
          detail: parseResult.error.message,
        });
      }

      const { message, contextTopic, currentFloorNumber } = parseResult.data;
      const response = worldState.askAria(message, contextTopic, currentFloorNumber);

      return reply.status(200).send(response);
    }
  );
}
