import { describe as group, expect, it } from 'vitest';
import { canEnter, canManage, describe, homeLot, HOME_LOT, type Viewer } from './world';

const alex: Viewer = {
  userId: 'alex',
  memberships: [
    { orgId: 'northgate', role: 'member', teamKey: 'design' },
    { orgId: 'side-co', role: 'owner', teamKey: null },
  ],
  invitedHomes: ['sam'],
};

group('canEnter', () => {
  it('lets anyone into the commons and the street outside a tower', () => {
    expect(canEnter(alex, { district: 'commons' })).toEqual({ allowed: true, as: 'public' });
    expect(canEnter(alex, { district: 'business', buildingId: 'b1' })).toEqual({ allowed: true, as: 'public' });
  });

  it('opens an org floor to its members and keeps everyone else out', () => {
    expect(canEnter(alex, { district: 'business', orgId: 'northgate' })).toEqual({ allowed: true, as: 'member' });
    expect(canEnter(alex, { district: 'business', orgId: 'side-co' })).toEqual({ allowed: true, as: 'owner' });
    expect(canEnter(alex, { district: 'business', orgId: 'acme' })).toEqual({ allowed: false, reason: 'not-a-member' });
  });

  it("treats another team's zone as part of the org, not a locked room", () => {
    expect(canEnter(alex, { district: 'business', orgId: 'northgate', teamKey: 'eng' }).allowed).toBe(true);
  });

  it('keeps a home private to its owner and invited guests', () => {
    expect(canEnter(alex, { district: 'residential', homeOwnerId: 'alex' })).toEqual({ allowed: true, as: 'owner' });
    expect(canEnter(alex, { district: 'residential', homeOwnerId: 'sam' })).toEqual({ allowed: true, as: 'guest' });
    expect(canEnter(alex, { district: 'residential', homeOwnerId: 'kim' })).toEqual({
      allowed: false,
      reason: 'private-home',
    });
  });

  it('lets anyone visit a home its owner has opened', () => {
    expect(canEnter(alex, { district: 'residential', homeOwnerId: 'kim', homeOpen: true })).toEqual({
      allowed: true,
      as: 'guest',
    });
  });

  it('lets an org guest in as a guest', () => {
    const guest: Viewer = {
      userId: 'g',
      memberships: [{ orgId: 'o', role: 'guest', teamKey: null }],
      invitedHomes: [],
    };
    expect(canEnter(guest, { district: 'business', orgId: 'o' })).toEqual({ allowed: true, as: 'guest' });
  });
});

group('canManage', () => {
  it('lets owners and admins run an org, not members', () => {
    expect(canManage(alex, { district: 'business', orgId: 'side-co' })).toBe(true);
    expect(canManage(alex, { district: 'business', orgId: 'northgate' })).toBe(false);
  });

  it('lets only the owner change a home, even for invited guests', () => {
    expect(canManage(alex, { district: 'residential', homeOwnerId: 'alex' })).toBe(true);
    expect(canManage(alex, { district: 'residential', homeOwnerId: 'sam' })).toBe(false);
  });

  it('gives nobody control of the commons', () => {
    expect(canManage(alex, { district: 'commons' })).toBe(false);
  });
});

group('describe', () => {
  it('names an address from the outside in', () => {
    expect(
      describe(
        { district: 'business', buildingId: 'b', level: 4, orgId: 'o', teamKey: 'design' },
        { building: 'North Tower', org: 'Northgate', team: 'Design' },
      ),
    ).toEqual(['IT Park', 'North Tower', 'Floor 4', 'Northgate', 'Design']);
    expect(describe({ district: 'residential', homeOwnerId: 'sam' }, { homeOwner: 'Sam' })).toEqual([
      'Homes',
      "Sam's home",
    ]);
  });
});

group('homeLot', () => {
  it('fills a row, then starts the next one', () => {
    expect(homeLot(0)).toEqual([...HOME_LOT.origin]);
    expect(homeLot(1)).toEqual([HOME_LOT.origin[0] + HOME_LOT.spacing, HOME_LOT.origin[1]]);
    expect(homeLot(HOME_LOT.perRow)).toEqual([HOME_LOT.origin[0], HOME_LOT.origin[1] + HOME_LOT.spacing]);
  });
});
