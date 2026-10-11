import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new AppError(404, 'not_found', what);
export const forbidden = (msg = 'You do not have permission to do that') => new AppError(403, 'forbidden', msg);
export const unauthorized = () => new AppError(401, 'unauthorized', 'Sign in to continue');
export const badRequest = (msg: string) => new AppError(400, 'bad_request', msg);
export const conflict = (msg: string) => new AppError(409, 'conflict', msg);

/** Every error leaves as { error: { code, message } } with no stack traces or SQL. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof AppError)
      return reply.status(err.status).send({ error: { code: err.code, message: err.message } });
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const where = first?.path.join('.') || 'request';
      return reply
        .status(400)
        .send({ error: { code: 'validation_failed', message: `${where}: ${first?.message ?? 'invalid'}` } });
    }
    const status = 'statusCode' in err && err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, 'request failed');
    return reply.status(status).send({
      error: {
        code: status === 429 ? 'rate_limited' : status >= 500 ? 'internal' : 'bad_request',
        message: status >= 500 ? `Something went wrong (ref ${req.id})` : err.message,
      },
    });
  });
  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'not_found', message: 'Not found' } }),
  );
}
