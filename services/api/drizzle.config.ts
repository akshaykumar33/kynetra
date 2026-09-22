import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Load .env from current directory or monorepo root
const localEnv = path.resolve(process.cwd(), '.env');
const rootEnv = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://kynetra_user:kynetra_password@localhost:5433/kynetra_world',
  },
});
