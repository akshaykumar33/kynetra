import type { FastifyInstance } from 'fastify';
import type { ServiceHealth } from '@kynetra/contracts';
import { checkDatabaseHealth } from '../db/index.js';

const START_TIME = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health/live', async () => {
    return { status: 'alive' };
  });

  app.get('/health/ready', async (): Promise<ServiceHealth> => {
    const memory = process.memoryUsage();
    const dbHealth = await checkDatabaseHealth();
    const dbStatus = dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

    return {
      service: '@kynetra/api',
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
      memoryUsageMb: Math.round(memory.heapUsed / 1024 / 1024),
      version: '0.1.0',
      dependencies: {
        database: dbStatus,
        cache: 'healthy',
      },
    };
  });
}
