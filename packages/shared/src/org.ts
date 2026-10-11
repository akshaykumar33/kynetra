import { z } from 'zod';
import { northgateFloor, type FloorLayout } from './layout';

/** How many companies one person may found. Joining others by invite has no limit. */
export const MAX_OWNED_ORGS = 3;

/** Team areas on a starter floor, in the order new teams move in. Each has its own desk pod. */
export const TEAM_ZONES = northgateFloor.zones.filter(z => z.kind === 'team').map(z => z.id);

export const OrgNameSchema = z.string().trim().min(2, 'At least 2 characters').max(40, 'At most 40 characters');
export const TeamNameSchema = z.string().trim().min(1, 'Give the team a name').max(30, 'At most 30 characters');

export const FoundOrgSchema = z
  .object({
    name: OrgNameSchema,
    buildingId: z.string().uuid(),
    level: z.number().int().min(1),
    teams: z.array(TeamNameSchema).min(1, 'Start with at least one team').max(TEAM_ZONES.length),
  })
  .strict()
  .refine(v => new Set(v.teams.map(t => t.toLowerCase())).size === v.teams.length, {
    message: 'Team names must be different',
    path: ['teams'],
  });
export type FoundOrg = z.infer<typeof FoundOrgSchema>;

/** A url-safe slug; the server adds a suffix if it is taken. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'company'
  );
}

/** Floors of a tower nobody leases yet. Level 1 and up; the lobby is the ground floor. */
export function vacantLevels(levels: number, leased: number[]): number[] {
  const taken = new Set(leased);
  return Array.from({ length: levels }, (_, i) => i + 1).filter(l => !taken.has(l));
}

/**
 * A new company's floor: the starter plan with each team's zone named after the team, and
 * zones nobody has claimed yet left as open desks.
 */
export function starterLayout(teams: { key: string; name: string }[]): FloorLayout {
  return {
    ...northgateFloor,
    zones: northgateFloor.zones.map(z => {
      if (z.kind !== 'team') return { ...z };
      const team = teams.find(t => t.key === z.id);
      return { ...z, name: team ? team.name : 'Open desks' };
    }),
  };
}

/** The zone the next new team moves into, or null when the floor is full. */
export function nextTeamZone(taken: string[]): string | null {
  return TEAM_ZONES.find(z => !taken.includes(z)) ?? null;
}
