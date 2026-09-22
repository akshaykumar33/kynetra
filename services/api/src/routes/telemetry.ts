import type { FastifyInstance } from 'fastify';
import type { WorldStats, LiveTelemetryMetric } from '@kynetra/contracts';
import { worldState } from '../data/world-state.js';

export async function telemetryRoutes(app: FastifyInstance) {
  app.get('/api/v1/telemetry/stats', async (): Promise<WorldStats> => {
    return worldState.getStats();
  });

  app.get('/api/v1/telemetry/live', async (): Promise<LiveTelemetryMetric> => {
    return worldState.getLiveTelemetry();
  });
}
