import type { FastifyInstance } from 'fastify';
import type { ServiceHealth } from '@kynetra/contracts';

const START_TIME = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health/live', async () => {
    return { status: 'alive' };
  });

  app.get('/health/ready', async (): Promise<ServiceHealth> => {
    const memory = process.memoryUsage();
    return {
      service: '@kynetra/api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
      memoryUsageMb: Math.round(memory.heapUsed / 1024 / 1024),
      version: '0.1.0',
      dependencies: {
        database: 'healthy',
        cache: 'healthy',
      },
    };
  });
}
