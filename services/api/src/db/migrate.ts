import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  console.log('[Migration] Applying migrations to PostgreSQL...');
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  await migrate(db, { migrationsFolder });
  console.log('[Migration] Migrations applied successfully.');
}

// Execute directly if invoked via CLI
if (process.argv[1] === __filename) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Migration] Failed to apply migrations:', err);
      await pool.end();
      process.exit(1);
    });
}
