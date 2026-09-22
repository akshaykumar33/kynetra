import { z } from 'zod';

export const IncidentScenarioIdSchema = z.enum([
  'db-starvation',
  'traffic-spike',
  'cascading-timeout',
  'memory-leak',
]);
export type IncidentScenarioId = z.infer<typeof IncidentScenarioIdSchema>;

export const IncidentSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const IncidentSimulationSchema = z.object({
  id: z.string(),
  scenarioId: IncidentScenarioIdSchema,
  name: z.string(),
  description: z.string(),
  severity: IncidentSeveritySchema,
  status: z.enum(['running', 'mitigating', 'resolved', 'failed']),
  districtId: z.string(),
  targetFloor: z.number().default(8),
  startedAt: z.string(),
  resolvedAt: z.string().optional(),
  errorRate: z.number(),
  p99LatencyMs: z.number(),
  dbPoolSaturation: z.number(),
  rootCause: z.string(),
  recommendedPatch: z.string(),
});
export type IncidentSimulation = z.infer<typeof IncidentSimulationSchema>;

export const PatchSubmissionRequestSchema = z.object({
  simulationId: z.string(),
  userHandle: z.string().default('developer'),
  patchConfig: z.object({
    maxConnections: z.number().optional(),
    connectionTimeoutMs: z.number().optional(),
    circuitBreakerEnabled: z.boolean().optional(),
    cacheTtlSeconds: z.number().optional(),
    command: z.string().optional(),
  }),
});
export type PatchSubmissionRequest = z.infer<typeof PatchSubmissionRequestSchema>;

export const PatchSubmissionResponseSchema = z.object({
  success: z.boolean(),
  simulationId: z.string(),
  status: z.enum(['resolved', 'rejected', 'partial_mitigation']),
  message: z.string(),
  metricsBefore: z.object({
    errorRate: z.number(),
    p99LatencyMs: z.number(),
  }),
  metricsAfter: z.object({
    errorRate: z.number(),
    p99LatencyMs: z.number(),
  }),
  xpAwarded: z.number(),
  badgeUnlocked: z.string().optional(),
});
export type PatchSubmissionResponse = z.infer<typeof PatchSubmissionResponseSchema>;
