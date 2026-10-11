import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { registerAuthRoutes } from './auth/routes';
import type { Config } from './config';
import type { Db } from './db/client';
import { AppError, registerErrorHandler } from './http/errors';
import { registerRealtime } from './realtime/routes';
import { registerApiRoutes } from './routes/api';
import { registerCampusRoutes } from './routes/campus';
import { registerVoiceRoutes } from './routes/voice';

export const CSRF_HEADER = 'x-knovra-csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Builds the API app. Kept separate from main.ts so tests can inject requests without a port. */
export async function buildApp({ db, config }: { db: Db; config: Config }) {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { redact: ['req.headers.cookie', 'req.headers.authorization'] },
    trustProxy: config.NODE_ENV === 'production',
  });

  await app.register(cookie, { secret: config.cookieSecret });
  await app.register(helmet);
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  registerErrorHandler(app);

  // CSRF: SameSite=Lax cookies already stop cross-site POSTs from carrying the session; on top of
  // that every state-changing request must carry a custom header (which forces a CORS preflight that
  // we never approve) and, when the browser sends an Origin, it must be our own.
  app.addHook('onRequest', async req => {
    if (SAFE_METHODS.has(req.method)) return;
    const origin = req.headers.origin;
    if (req.headers[CSRF_HEADER] !== '1' || (origin && origin !== config.APP_ORIGIN))
      throw new AppError(403, 'csrf_failed', 'Request blocked. Reload the page and try again.');
  });

  app.get('/health', async () => ({ status: 'ok' }));
  registerAuthRoutes(app, db, config);
  registerApiRoutes(app, db, config);
  registerVoiceRoutes(app, db, config);
  registerCampusRoutes(app, db);
  await registerRealtime(app, db, config);
  return app;
}
