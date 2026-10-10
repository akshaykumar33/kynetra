import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const bool = z
  .enum(['0', '1', 'true', 'false'])
  .optional()
  .transform(v => v === '1' || v === 'true');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // postgres://… for a real server, memory:// for tests, otherwise a PGlite folder
  DATABASE_URL: z.string().min(1).default('.data/pglite'),
  // where the web app is served; used for redirects and the CSRF origin check
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  // signs the short-lived sign-in cookie (PKCE verifier, state, nonce)
  COOKIE_SECRET: z.string().min(32).optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_DEV_LOGIN: bool,
  // how long someone stays on the floor after their connection drops
  PRESENCE_GRACE_MS: z.coerce.number().int().nonnegative().default(30_000),
  SEED_ON_START: bool,
  OIDC_GOOGLE_CLIENT_ID: z.string().optional(),
  OIDC_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OIDC_MICROSOFT_CLIENT_ID: z.string().optional(),
  OIDC_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  OIDC_MICROSOFT_TENANT: z.string().default('common'),
});

export type Config = z.infer<typeof EnvSchema> & { devLogin: boolean; cookieSecret: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // treat KEY= (empty) the same as unset so .env files can list optional keys
  const parsed = EnvSchema.parse(Object.fromEntries(Object.entries(env).filter(([, v]) => v !== '')));
  if (parsed.NODE_ENV === 'production' && !parsed.COOKIE_SECRET)
    throw new Error('COOKIE_SECRET is required in production');
  const cookieSecret = parsed.COOKIE_SECRET ?? randomBytes(32).toString('hex');
  // The password-less dev sign-in must never be reachable in production, whatever the env says.
  return { ...parsed, cookieSecret, devLogin: parsed.AUTH_DEV_LOGIN && parsed.NODE_ENV !== 'production' };
}
