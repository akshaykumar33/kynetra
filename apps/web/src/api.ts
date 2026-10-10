import type { FloorLayout, Person, Status } from '@knovra/shared';

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
      'x-knovra-csrf': '1',
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
