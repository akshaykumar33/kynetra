import type { FloorLayout, HomeDecor, Person, Status, WorldMap } from '@kynetra/shared';

export interface Me {
  user: { id: string; email: string; name: string };
  orgs: { id: string; name: string; role: 'owner' | 'admin' | 'member' | 'guest'; onboarded: boolean }[];
}

export interface FloorData {
  org: { id: string; name: string };
  floor: { name: string; level: number; layoutVersion: number };
  layout: FloorLayout;
  teams: { key: string; name: string }[];
  meId: string;
  people: Person[];
}

export interface Avatar {
  body: string;
  skin: string;
  hair: string;
}

export interface UpdateMe {
  status?: Exclude<Status, 'meeting'>;
  workMode?: 'office' | 'remote';
  title?: string;
  teamKey?: string;
  avatar?: Avatar;
  deskKey?: string | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      // required by the server on every state-changing request (CSRF guard)
      'x-kynetra-csrf': '1',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'error',
      data?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export const api = {
  providers: () => request<{ providers: string[]; devLogin: boolean }>('GET', '/auth/providers'),
  devLogin: (email: string) => request<{ ok: true }>('POST', '/auth/dev/login', { email }),
  logout: () => request<{ ok: true }>('POST', '/auth/logout'),
  me: () => request<Me>('GET', '/api/v1/me'),
  floor: (orgId: string) => request<FloorData>('GET', `/api/v1/orgs/${orgId}/floor`),
  updateMe: (orgId: string, patch: UpdateMe) => request<{ ok: true }>('PATCH', `/api/v1/orgs/${orgId}/me`, patch),
  voiceToken: (orgId: string) =>
    request<{ url: string; room: string; token: string }>('POST', `/api/v1/orgs/${orgId}/voice-token`),
  acceptInvite: (token: string) => request<{ orgId: string }>('POST', '/api/v1/invites/accept', { token }),
};

export interface CampusBuilding {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  levels: number;
  color: string;
  floors: { level: number; tenant: string; mine: boolean }[];
}

export interface Campus {
  name: string;
  buildings: CampusBuilding[];
  mine: { buildingId: string; level: number } | null;
}

export const campusApi = {
  get: (orgId: string) => request<Campus>('GET', `/api/v1/orgs/${orgId}/campus`),
};

export type WorldHome = WorldMap['homes'][number];

export const worldApi = {
  get: () => request<WorldMap>('GET', '/api/v1/world'),
};

/**
 * The IT park part of the world, as the lobby and lift see it: business towers only, with each
 * floor marked if it belongs to `orgId`. Empty `orgId` (no company yet) marks nothing as yours.
 */
export function toCampus(world: WorldMap, orgId: string): Campus {
  let mine: Campus['mine'] = null;
  const buildings = world.buildings
    .filter(b => b.district === 'business')
    .map(b => ({
      id: b.id,
      name: b.name,
      x: b.x,
      z: b.z,
      width: b.width,
      depth: b.depth,
      levels: b.levels,
      color: b.color,
      floors: b.tenants.map(t => {
        const isMine = !!orgId && t.orgId === orgId;
        if (isMine) mine = { buildingId: b.id, level: t.level };
        return { level: t.level, tenant: t.name, mine: isMine };
      }),
    }));
  return { name: 'Kynetra IT Park', buildings, mine };
}

export interface HomeView {
  home: { ownerId: string; name: string; open: boolean; decor: HomeDecor };
  owner: { name: string };
  as: 'owner' | 'guest';
  notes: { id: string; author: string; text: string; createdAt: string; mine: boolean; canDelete: boolean }[];
  guests: { id: string; name: string }[] | null;
}

export const homeApi = {
  get: (ownerId: string) => request<HomeView>('GET', `/api/v1/homes/${ownerId}`),
  update: (patch: { open?: boolean; name?: string; decor?: HomeDecor }) =>
    request<{ ok: true }>('PATCH', '/api/v1/homes/mine', patch),
  invite: (email: string) => request<{ ok: true }>('POST', '/api/v1/homes/mine/guests', { email }),
  uninvite: (guestId: string) => request<{ ok: true }>('DELETE', `/api/v1/homes/mine/guests/${guestId}`),
  addNote: (ownerId: string, text: string) =>
    request<{ id: string }>('POST', `/api/v1/homes/${ownerId}/notes`, { text }),
  deleteNote: (ownerId: string, noteId: string) =>
    request<{ ok: true }>('DELETE', `/api/v1/homes/${ownerId}/notes/${noteId}`),
};

export interface Vacancy {
  id: string;
  name: string;
  levels: number;
  vacant: number[];
}

export interface ManageView {
  role: 'owner' | 'admin';
  people: number;
  teams: { key: string; name: string; people: number }[];
  roomForTeams: boolean;
}

export const orgApi = {
  vacancies: () => request<{ buildings: Vacancy[] }>('GET', '/api/v1/vacancies'),
  found: (body: { name: string; buildingId: string; level: number; teams: string[] }) =>
    request<{ orgId: string }>('POST', '/api/v1/orgs', body),
  manage: (orgId: string) => request<ManageView>('GET', `/api/v1/orgs/${orgId}/manage`),
  addTeam: (orgId: string, name: string) => request<{ key: string }>('POST', `/api/v1/orgs/${orgId}/teams`, { name }),
  renameTeam: (orgId: string, key: string, name: string) =>
    request<{ ok: true }>('PATCH', `/api/v1/orgs/${orgId}/teams/${key}`, { name }),
  invite: (orgId: string, email: string, role: 'admin' | 'member' | 'guest') =>
    request<{ link: string }>('POST', `/api/v1/orgs/${orgId}/invites`, { email, role }),
};
