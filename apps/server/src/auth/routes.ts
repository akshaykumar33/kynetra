import type { FastifyInstance } from 'fastify';
import * as oidc from 'openid-client';
import { z } from 'zod';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { AppError, badRequest, notFound } from '../http/errors';
import { endSession, startSession } from './sessions';
import { upsertUser } from './users';

interface Provider {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

function providers(config: Config): Record<string, Provider> {
  const out: Record<string, Provider> = {};
  if (config.OIDC_GOOGLE_CLIENT_ID && config.OIDC_GOOGLE_CLIENT_SECRET)
    out.google = {
      issuer: 'https://accounts.google.com',
      clientId: config.OIDC_GOOGLE_CLIENT_ID,
      clientSecret: config.OIDC_GOOGLE_CLIENT_SECRET,
    };
  if (config.OIDC_MICROSOFT_CLIENT_ID && config.OIDC_MICROSOFT_CLIENT_SECRET)
    out.microsoft = {
      issuer: `https://login.microsoftonline.com/${config.OIDC_MICROSOFT_TENANT}/v2.0`,
      clientId: config.OIDC_MICROSOFT_CLIENT_ID,
      clientSecret: config.OIDC_MICROSOFT_CLIENT_SECRET,
    };
  return out;
}

const FLOW_COOKIE = 'knovra_oidc';

export function registerAuthRoutes(app: FastifyInstance, db: Db, config: Config) {
  const configured = providers(config);
  const discovered = new Map<string, Promise<oidc.Configuration>>();
  const discover = (name: string) => {
    const p = configured[name];
    if (!p) throw notFound('Unknown sign-in provider');
    if (!discovered.has(name)) discovered.set(name, oidc.discovery(new URL(p.issuer), p.clientId, p.clientSecret));
    return discovered.get(name)!;
  };
  const callbackUrl = (name: string) => `${config.APP_ORIGIN}/auth/${name}/callback`;

  // Which sign-in options the web app should show.
  app.get('/auth/providers', async () => ({
    providers: Object.keys(configured),
    devLogin: config.devLogin,
  }));

  app.get('/auth/:provider/start', async (req, reply) => {
    const { provider } = z.object({ provider: z.string() }).parse(req.params);
    const client = await discover(provider);
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    reply.setCookie(FLOW_COOKIE, JSON.stringify({ verifier, state, nonce, provider }), {
      path: '/auth',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
      signed: true,
      maxAge: 600,
    });
    const url = oidc.buildAuthorizationUrl(client, {
      redirect_uri: callbackUrl(provider),
      scope: 'openid email profile',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
      state,
      nonce,
    });
    return reply.redirect(url.href);
  });

  app.get('/auth/:provider/callback', async (req, reply) => {
    const { provider } = z.object({ provider: z.string() }).parse(req.params);
    const raw = req.cookies[FLOW_COOKIE];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (!unsigned?.valid || !unsigned.value) throw badRequest('Sign-in expired. Please try again.');
    const flow = z
      .object({ verifier: z.string(), state: z.string(), nonce: z.string(), provider: z.string() })
      .parse(JSON.parse(unsigned.value));
    if (flow.provider !== provider) throw badRequest('Sign-in expired. Please try again.');
    reply.clearCookie(FLOW_COOKIE, { path: '/auth' });

    const client = await discover(provider);
    const current = new URL(req.url, config.APP_ORIGIN);
    let claims: oidc.IDToken | undefined;
    try {
      const tokens = await oidc.authorizationCodeGrant(client, current, {
        pkceCodeVerifier: flow.verifier,
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        idTokenExpected: true,
      });
      claims = tokens.claims();
    } catch (err) {
      req.log.warn({ err }, 'oidc callback rejected');
      throw new AppError(401, 'sign_in_failed', 'Sign-in failed. Please try again.');
    }
    const email = typeof claims?.email === 'string' ? claims.email : null;
    if (!claims || !email || claims.email_verified === false)
      throw new AppError(401, 'sign_in_failed', 'Your account needs a verified email address.');
    const user = await upsertUser(db, {
      email,
      name: typeof claims.name === 'string' ? claims.name : email,
      subject: `${provider}:${claims.sub}`,
    });
    await startSession(db, config, reply, user.id);
    return reply.redirect(`${config.APP_ORIGIN}/`);
  });

  // Password-less sign-in for local development and automated tests only.
  if (config.devLogin) {
    app.post('/auth/dev/login', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
      const body = z
        .object({ email: z.string().email().max(200), name: z.string().max(100).default('') })
        .parse(req.body);
      const user = await upsertUser(db, body);
      await startSession(db, config, reply, user.id);
      return { ok: true };
    });
  }

  app.post('/auth/logout', async (req, reply) => {
    await endSession(db, req, reply);
    return { ok: true };
  });
}
