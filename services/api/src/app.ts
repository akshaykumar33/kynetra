import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { worldRoutes } from './routes/world.js';
import { telemetryRoutes } from './routes/telemetry.js';
import { aiRoutes } from './routes/ai.js';
import { gamificationRoutes } from './routes/gamification.js';

export function buildApp() {
  const app = Fastify({
    logger: false,
  });

  app.register(cors, {
    origin: '*',
  });

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = body ? JSON.parse(body as string) : {};
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  app.register(healthRoutes);
  app.register(worldRoutes);
  app.register(telemetryRoutes);
  app.register(aiRoutes);
  app.register(gamificationRoutes);

  return app;
}
