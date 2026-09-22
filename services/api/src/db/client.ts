import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

const { Pool } = pg;

// Load environment variables
const localEnv = path.resolve(process.cwd(), '.env');
const rootEnv = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://kynetra_user:kynetra_password@localhost:5433/kynetra_world';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export type DatabaseInstance = typeof db;

export interface DatabaseHealthResult {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
  totalConnections?: number;
  idleConnections?: number;
  waitingCount?: number;
}

/**
 * Checks database connectivity with latency calculation
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      return {
        status: 'healthy',
        latencyMs,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingCount: pool.waitingCount,
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Retries database connection with exponential backoff
 */
export async function connectWithRetry(
  maxRetries = 5,
  initialDelayMs = 1000
): Promise<boolean> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    attempt += 1;
    const health = await checkDatabaseHealth();
    if (health.status === 'healthy') {
      return true;
    }
    console.warn(
      `[Database] Connection attempt ${attempt}/${maxRetries} failed (${health.error}). Retrying in ${delay}ms...`
    );
    await new Promise((res) => setTimeout(res, delay));
    delay *= 2;
  }

  throw new Error(`[Database] Failed to connect after ${maxRetries} attempts.`);
}

/**
 * Gracefully close the database pool
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
