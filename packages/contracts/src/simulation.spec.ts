import { describe, it, expect } from 'vitest';
import {
  IncidentSimulationSchema,
  PatchSubmissionRequestSchema,
  PatchSubmissionResponseSchema,
} from './simulation.js';
import { GamificationProfileSchema, LeaderboardEntrySchema } from './gamification.js';
import { AiChatRequestSchema, AiChatResponseSchema } from './ai.js';

describe('Simulation & Gamification Contracts', () => {
  it('should validate an incident simulation object', () => {
    const validSim = {
      id: 'sim-101',
      scenarioId: 'db-starvation',
      name: 'PostgreSQL Connection Pool Starvation',
      description: 'Active client connections have reached 100%.',
      severity: 'critical',
      status: 'running',
      districtId: 'kynetra-central',
      targetFloor: 8,
      startedAt: new Date().toISOString(),
      errorRate: 14.8,
      p99LatencyMs: 2450,
      dbPoolSaturation: 0.98,
      rootCause: 'Connection leak in billing worker queue',
      recommendedPatch: 'Scale pool to 50 and set connectionTimeoutMs to 5000',
    };

    const parsed = IncidentSimulationSchema.parse(validSim);
    expect(parsed.scenarioId).toBe('db-starvation');
    expect(parsed.severity).toBe('critical');
  });

  it('should validate patch submissions and responses', () => {
    const patchReq = {
      simulationId: 'sim-101',
      userHandle: 'sre-dev',
      patchConfig: {
        maxConnections: 50,
        connectionTimeoutMs: 5000,
        circuitBreakerEnabled: true,
      },
    };

    const parsedReq = PatchSubmissionRequestSchema.parse(patchReq);
    expect(parsedReq.patchConfig.maxConnections).toBe(50);

    const patchRes = {
      success: true,
      simulationId: 'sim-101',
      status: 'resolved',
      message: 'DB pool expanded. Latency dropped to 12ms.',
      metricsBefore: { errorRate: 14.8, p99LatencyMs: 2450 },
      metricsAfter: { errorRate: 0.02, p99LatencyMs: 14 },
      xpAwarded: 500,
      badgeUnlocked: 'Pool Starvation Hero',
    };

    const parsedRes = PatchSubmissionResponseSchema.parse(patchRes);
    expect(parsedRes.xpAwarded).toBe(500);
    expect(parsedRes.badgeUnlocked).toBe('Pool Starvation Hero');
  });

  it('should validate user profiles and leaderboard entries', () => {
    const profile = {
      id: 'usr-1',
      handle: 'alex_architect',
      displayName: 'Alex Rivers',
      role: 'architect',
      level: 14,
      currentXp: 4250,
      nextLevelXp: 5000,
      rankTitle: 'Senior SRE Architect',
      avatarColor: '#10b981',
      badges: [
        {
          id: 'badge-sre-gold',
          name: 'Incident Commander',
          description: 'Resolved 10+ critical outages',
          icon: '🛡️',
          category: 'sre',
        },
      ],
      stats: {
        incidentsResolved: 12,
        arenaMatchesWon: 5,
        codePatchesSubmitted: 34,
        uptimeContributionHours: 120,
      },
    };

    const parsedProfile = GamificationProfileSchema.parse(profile);
    expect(parsedProfile.level).toBe(14);
    expect(parsedProfile.badges).toHaveLength(1);

    const entry = {
      rank: 1,
      handle: 'alex_architect',
      displayName: 'Alex Rivers',
      level: 14,
      totalXp: 4250,
      incidentsResolved: 12,
      rankTitle: 'Senior SRE Architect',
      districtAffiliation: 'Cloud & SRE District',
    };

    const parsedEntry = LeaderboardEntrySchema.parse(entry);
    expect(parsedEntry.rank).toBe(1);
  });

  it('should validate AI chat interactions', () => {
    const chatReq = {
      message: 'How do I resolve connection pool starvation?',
      contextTopic: 'sre_incident',
    };

    const parsedReq = AiChatRequestSchema.parse(chatReq);
    expect(parsedReq.userHandle).toBe('developer');

    const chatRes = {
      reply: 'Scale the pool size and adjust idle connection timeouts.',
      sender: 'Aria (AI Concierge)',
      suggestedActions: ['Run diagnose-pool', 'Submit patch'],
      relevantDocs: ['docs/10-runbooks/db-pool-exhaustion.md'],
      timestamp: new Date().toISOString(),
    };

    const parsedRes = AiChatResponseSchema.parse(chatRes);
    expect(parsedRes.suggestedActions).toHaveLength(2);
  });
});
