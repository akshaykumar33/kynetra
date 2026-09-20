import { buildApp } from './app.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`[Kynetra Platform API] Running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error({ err }, 'Failed to start API service');
    process.exit(1);
  }
}

start();
