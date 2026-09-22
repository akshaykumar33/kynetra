import { z } from 'zod';
import { UserRoleSchema } from './user.js';

export const SkillBadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.enum(['sre', 'backend', 'architecture', 'security', 'community']),
  unlockedAt: z.string().optional(),
});
export type SkillBadge = z.infer<typeof SkillBadgeSchema>;

export const GamificationProfileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  role: UserRoleSchema,
  level: z.number(),
  currentXp: z.number(),
  nextLevelXp: z.number(),
  rankTitle: z.string(),
  avatarColor: z.string(),
  badges: z.array(SkillBadgeSchema),
  stats: z.object({
    incidentsResolved: z.number(),
    arenaMatchesWon: z.number(),
    codePatchesSubmitted: z.number(),
    uptimeContributionHours: z.number(),
  }),
});
export type GamificationProfile = z.infer<typeof GamificationProfileSchema>;

export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  handle: z.string(),
  displayName: z.string(),
  level: z.number(),
  totalXp: z.number(),
  incidentsResolved: z.number(),
  rankTitle: z.string(),
  districtAffiliation: z.string(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
