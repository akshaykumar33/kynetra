import { z } from 'zod';

export const TelemetryEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  sourceService: z.string(),
  eventType: z.string(),
  traceId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

export const WorldStatsSchema = z.object({
  totalOnlineDevelopers: z.number(),
  activeSimulations: z.number(),
  codingArenaMatches: z.number(),
  systemUptimePercentage: z.number(),
  districtsActive: z.number(),
  lastUpdated: z.string(),
});
export type WorldStats = z.infer<typeof WorldStatsSchema>;

export const LiveTelemetryMetricSchema = z.object({
  timestamp: z.string(),
  cpuUsagePercent: z.number(),
  memoryUsagePercent: z.number(),
  dbPoolActiveConnections: z.number(),
  dbPoolMaxConnections: z.number(),
  p99LatencyMs: z.number(),
  errorRate5xx: z.number(),
  requestsPerSecond: z.number(),
  activeIncidents: z.number(),
});
export type LiveTelemetryMetric = z.infer<typeof LiveTelemetryMetricSchema>;

