import Fastify from 'fastify';

/** Builds the API app. Kept separate from main.ts so tests can inject requests without a port. */
export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
