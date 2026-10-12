import { z } from 'zod';

/**
 * The world: one map that holds everyone, from a single person to whole companies.
 *
 *   world → district → building → floor → org (lease) → team zone → desk
 *                    ↘ home (one per person, in the residential district)
 *
 * Districts say what a place is for, and that decides who may walk in.
 */
export const DISTRICTS = ['commons', 'business', 'residential'] as const;
export type District = (typeof DISTRICTS)[number];
export const DistrictSchema = z.enum(DISTRICTS);

export const DISTRICT_LABEL: Record<District, string> = {
  commons: 'Commons',
  business: 'IT Park',
  residential: 'Homes',
};

export type Role = 'owner' | 'admin' | 'member' | 'guest';

/** Where something is in the world, from the outside in. Deeper fields need the shallower ones. */
export const AddressSchema = z.object({
  district: DistrictSchema,
  buildingId: z.string().optional(),
  level: z.number().int().optional(),
  orgId: z.string().optional(),
  teamKey: z.string().optional(),
  homeOwnerId: z.string().optional(),
  // an open home lets anyone visit as a guest
  homeOpen: z.boolean().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

/** Who is asking: the person and every org they belong to. */
export interface Viewer {
  userId: string;
  memberships: { orgId: string; role: Role; teamKey: string | null }[];
  /** Homes whose owner has invited this person in. */
  invitedHomes: string[];
}

export type Entry =
  | { allowed: true; as: 'public' | 'owner' | 'member' | 'guest' }
  | { allowed: false; reason: 'private-home' | 'not-a-member' };

/**
 * The one rule for walking into a place.
 *  - Commons and the outside of every building are public.
 *  - An org's floor is open to its members (guests too, while their invite lasts).
 *  - A team zone is open to everyone in the org: teams are neighbourhoods, not locked rooms.
 *  - A home is private: its owner and the people they invite, unless the owner opens it.
 */
export function canEnter(viewer: Viewer, place: Address): Entry {
  if (place.district === 'residential' && place.homeOwnerId) {
    if (place.homeOwnerId === viewer.userId) return { allowed: true, as: 'owner' };
    if (place.homeOpen || viewer.invitedHomes.includes(place.homeOwnerId)) return { allowed: true, as: 'guest' };
    return { allowed: false, reason: 'private-home' };
  }
  if (place.orgId) {
    const m = viewer.memberships.find(x => x.orgId === place.orgId);
    if (!m) return { allowed: false, reason: 'not-a-member' };
    return { allowed: true, as: m.role === 'owner' ? 'owner' : m.role === 'guest' ? 'guest' : 'member' };
  }
  return { allowed: true, as: 'public' };
}

/** What a person may change at a place: owners and admins run the org, owners their home. */
export function canManage(viewer: Viewer, place: Address): boolean {
  if (place.homeOwnerId) return place.homeOwnerId === viewer.userId;
  if (!place.orgId) return false;
  const m = viewer.memberships.find(x => x.orgId === place.orgId);
  return m?.role === 'owner' || m?.role === 'admin';
}

/** Names for each step of an address, outermost first, for breadcrumbs and announcements. */
export function describe(
  place: Address,
  names: { building?: string; org?: string; team?: string; homeOwner?: string } = {},
): string[] {
  const parts = [DISTRICT_LABEL[place.district]];
  if (place.homeOwnerId) parts.push(names.homeOwner ? `${names.homeOwner}'s home` : 'Home');
  if (place.buildingId) parts.push(names.building ?? 'Building');
  if (place.level !== undefined) parts.push(`Floor ${place.level}`);
  if (place.orgId) parts.push(names.org ?? 'Office');
  if (place.teamKey) parts.push(names.team ?? place.teamKey);
  return parts;
}

/** The home plots: a grid of lots in the residential district, filled in order of sign-up. */
export const HOME_LOT = { origin: [-63, 148] as const, spacing: 18, perRow: 8 };

export function homeLot(index: number): [number, number] {
  const row = Math.floor(index / HOME_LOT.perRow);
  const col = index % HOME_LOT.perRow;
  return [HOME_LOT.origin[0] + col * HOME_LOT.spacing, HOME_LOT.origin[1] + row * HOME_LOT.spacing];
}

/** The world map the server sends: every district's places plus where the viewer belongs. */
export const WorldMapSchema = z.object({
  name: z.string(),
  buildings: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      district: DistrictSchema,
      x: z.number(),
      z: z.number(),
      width: z.number(),
      depth: z.number(),
      levels: z.number().int(),
      color: z.string(),
      tenants: z.array(z.object({ level: z.number().int(), orgId: z.string(), name: z.string() })),
    }),
  ),
  homes: z.array(
    z.object({
      ownerId: z.string(),
      name: z.string(),
      x: z.number(),
      z: z.number(),
      mine: z.boolean(),
      open: z.boolean(),
    }),
  ),
  you: z.object({
    userId: z.string(),
    name: z.string(),
    /** Homes whose owners have invited you in. */
    invitedHomes: z.array(z.string()),
    orgs: z.array(
      z.object({
        orgId: z.string(),
        name: z.string(),
        role: z.enum(['owner', 'admin', 'member', 'guest']),
        team: z.object({ key: z.string(), name: z.string() }).nullable(),
        office: z.object({ buildingId: z.string(), level: z.number().int() }).nullable(),
      }),
    ),
  }),
});
export type WorldMap = z.infer<typeof WorldMapSchema>;
