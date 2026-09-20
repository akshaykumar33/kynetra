import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { worldRoutes } from './routes/world.js';
import { telemetryRoutes } from './routes/telemetry.js';

export function buildApp() {
  const app = Fastify({
    // Structured logging is the foundation the OpenTelemetry work builds on
    // (docs/02-architecture/observability). Silenced under test so suite
    // output stays readable.
    logger: process.env.NODE_ENV === 'test' ? false : { level: process.env.LOG_LEVEL ?? 'info' },
  });

  app.register(cors, {
    origin: '*',
  });

  app.register(healthRoutes);
  app.register(worldRoutes);
  app.register(telemetryRoutes);

  return app;
}
