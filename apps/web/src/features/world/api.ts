import {
  ServiceHealthSchema,
  WorldDistrictsResponseSchema,
  type ServiceHealth,
  type WorldDistrictsResponse,
} from '@kynetra/contracts';
import type { z } from 'zod';
import { API_BASE_URL } from '@/lib/env';

const REQUEST_TIMEOUT_MS = 8_000;

export type ApiFailureKind = 'network' | 'timeout' | 'not_found' | 'server' | 'contract';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.output<S>> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: combined,
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    // A cancellation by the caller (e.g. React Query unmount) is not a failure to report.
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new ApiError('timeout', `${path} did not respond within ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw new ApiError('network', `${path} could not be reached`);
  }

  if (response.status === 404) throw new ApiError('not_found', `${path} was not found`, 404);
  if (!response.ok) {
    throw new ApiError('server', `${path} responded ${response.status}`, response.status);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError('contract', `${path} returned data that does not match its contract`);
  }
  return parsed.data;
}

export function fetchDistricts(signal?: AbortSignal): Promise<WorldDistrictsResponse> {
  return getJson('/api/v1/world/districts', WorldDistrictsResponseSchema, signal);
}

export function fetchApiHealth(signal?: AbortSignal): Promise<ServiceHealth> {
  return getJson('/health/ready', ServiceHealthSchema, signal);
}

/** Human copy for a failure — never a raw status code or enum on its own. */
export function describeApiError(error: unknown): { title: string; detail: string } {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Something went wrong loading the world',
      detail: 'An unexpected error interrupted the request. Try again in a moment.',
    };
  }
  switch (error.kind) {
    case 'network':
      return {
        title: 'Can’t reach the Kynetra platform',
        detail: `The platform API at ${API_BASE_URL} isn’t answering. Check that it is running (pnpm run dev) and try again.`,
      };
    case 'timeout':
      return {
        title: 'The platform is taking too long',
        detail: 'The request timed out. The service may be under load — try again shortly.',
      };
    case 'not_found':
      return {
        title: 'That part of the world no longer exists',
        detail: 'The platform couldn’t find what was requested. It may have been removed.',
      };
    case 'contract':
      return {
        title: 'The platform sent data we can’t read',
        detail:
          'The response didn’t match the shared contract, so it wasn’t shown. This usually means the web app and API are on different versions.',
      };
    case 'server':
      return {
        title: 'The platform hit a problem on its side',
        detail: `The API responded with an error (HTTP ${error.status ?? 'unknown'}). This one is on us — try again.`,
      };
  }
}
