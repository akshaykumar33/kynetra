import { describe, expect, it } from 'vitest';
import { FloorLayoutSchema } from './layout';
import { FoundOrgSchema, nextTeamZone, slugify, starterLayout, TEAM_ZONES, vacantLevels } from './org';

const base = { name: 'Moonbase Labs', buildingId: '00000000-0000-4000-8000-000000000000', level: 3 };

describe('founding a company', () => {
  it('needs a name, a floor and one to three distinct teams', () => {
    expect(FoundOrgSchema.safeParse({ ...base, teams: ['Rockets'] }).success).toBe(true);
    expect(FoundOrgSchema.safeParse({ ...base, teams: [] }).success).toBe(false);
    expect(FoundOrgSchema.safeParse({ ...base, teams: ['A', 'B', 'C', 'D'] }).success).toBe(false);
    expect(FoundOrgSchema.safeParse({ ...base, teams: ['Ops', 'ops'] }).success).toBe(false);
    expect(FoundOrgSchema.safeParse({ ...base, name: ' x ', teams: ['Ops'] }).success).toBe(false);
    expect(FoundOrgSchema.safeParse({ ...base, teams: ['Ops'], role: 'admin' }).success).toBe(false);
  });

  it('makes url-safe slugs, even from names with no letters', () => {
    expect(slugify('Café Rocket & Co.')).toBe('cafe-rocket-co');
    expect(slugify('!!!')).toBe('company');
  });
});

describe('floors', () => {
  it('lists the floors nobody leases', () => {
    expect(vacantLevels(5, [2, 4])).toEqual([1, 3, 5]);
    expect(vacantLevels(2, [1, 2])).toEqual([]);
  });

  it('names team zones after the teams and leaves the rest as open desks', () => {
    const layout = starterLayout([{ key: TEAM_ZONES[0], name: 'Rockets' }]);
    expect(FloorLayoutSchema.safeParse(layout).success).toBe(true);
    const teamZones = layout.zones.filter(z => z.kind === 'team').map(z => z.name);
    expect(teamZones).toEqual(['Rockets', 'Open desks', 'Open desks']);
  });

  it('moves new teams into free zones until the floor is full', () => {
    expect(nextTeamZone([])).toBe(TEAM_ZONES[0]);
    expect(nextTeamZone([TEAM_ZONES[0]])).toBe(TEAM_ZONES[1]);
    expect(nextTeamZone([...TEAM_ZONES])).toBeNull();
  });
});
