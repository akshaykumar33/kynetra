import { createHash, randomBytes } from 'node:crypto';

/** 256-bit random token, URL-safe. */
export const newToken = () => randomBytes(32).toString('base64url');

/** Tokens are stored hashed so a database leak doesn't leak live sessions or invites. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
