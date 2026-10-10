// `npm run db:migrate` and `npm run db:seed` against DATABASE_URL.
import { loadConfig } from '../config';
import { openDatabase } from './client';
import { seedNorthgate } from './seed';

const command = process.argv[2];
const database = openDatabase(loadConfig().DATABASE_URL);
await database.migrate();
if (command === 'seed') console.log(`Seeded Northgate (org ${await seedNorthgate(database.db)})`);
else console.log('Migrations applied');
await database.close();
