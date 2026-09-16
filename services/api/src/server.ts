import { buildApp } from './app.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`[Kynetra Platform API] Running at http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Failed to start API service:', err);
    process.exit(1);
  }
}

start();
