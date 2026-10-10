import { buildApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/client';
import { seedNorthgate } from './db/seed';

const config = loadConfig();
const database = openDatabase(config.DATABASE_URL);
await database.migrate();
if (config.SEED_ON_START) await seedNorthgate(database.db);

const app = await buildApp({ db: database.db, config });

const shutdown = async () => {
  await app.close();
  await database.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.PORT, host: '0.0.0.0' });
