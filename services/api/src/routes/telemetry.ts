import type { FastifyInstance } from 'fastify';
import type { WorldStats } from '@kynetra/contracts';
import { INITIAL_DISTRICTS } from '../data/mock-world.js';

export async function telemetryRoutes(app: FastifyInstance) {
  app.get('/api/v1/telemetry/stats', async (): Promise<WorldStats> => {
    const totalUsers = INITIAL_DISTRICTS.reduce((sum, d) => sum + d.activeUsers, 0);

    return {
      totalOnlineDevelopers: totalUsers,
      activeSimulations: 18,
      codingArenaMatches: 9,
      systemUptimePercentage: 99.98,
      districtsActive: INITIAL_DISTRICTS.filter((d) => d.status === 'active').length,
      lastUpdated: new Date().toISOString(),
    };
  });
}
