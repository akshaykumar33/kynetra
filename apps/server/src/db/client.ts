import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import * as schema from './schema';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

export interface Database {
  db: Db;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Opens the database named by `url`.
 * - `postgres://…` connects to a real Postgres server.
 * - `memory://` runs an in-memory PGlite (tests).
 * - anything else is a PGlite data directory (local development, no Docker needed).
 */
export function openDatabase(url: string): Database {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const client = postgres(url, { max: 10 });
    const db = drizzlePg(client, { schema });
    return {
      // both drivers expose the same query builder; the cast keeps one Db type across the app
      db: db as unknown as Db,
      migrate: () => migratePg(db, { migrationsFolder }),
      close: () => client.end(),
    };
  }
  if (url !== 'memory://') mkdirSync(url, { recursive: true });
  const client = new PGlite(url === 'memory://' ? undefined : url);
  const db = drizzlePglite(client, { schema });
  return {
    db,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
