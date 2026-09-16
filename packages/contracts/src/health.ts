import { z } from 'zod';

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ServiceHealthSchema = z.object({
  service: z.string(),
  status: HealthStatusSchema,
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  memoryUsageMb: z.number().nonnegative(),
  version: z.string(),
  dependencies: z.record(z.string(), HealthStatusSchema).optional(),
});
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;
