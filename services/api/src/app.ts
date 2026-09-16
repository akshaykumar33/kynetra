import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { worldRoutes } from './routes/world.js';
import { telemetryRoutes } from './routes/telemetry.js';

export function buildApp() {
  const app = Fastify({
    logger: false,
  });

  app.register(cors, {
    origin: '*',
  });

  app.register(healthRoutes);
  app.register(worldRoutes);
  app.register(telemetryRoutes);

  return app;
}
