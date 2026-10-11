import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, describeApiError, fetchDistricts } from './api';

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchDistricts', () => {
  it('returns contract-validated districts', async () => {
    respondWith({ districts: [], totalActiveUsers: 0 });
    await expect(fetchDistricts()).resolves.toEqual({ districts: [], totalActiveUsers: 0 });
  });

  it('rejects data that breaks the shared contract instead of rendering it', async () => {
    respondWith({ districts: [{ id: 'half-a-district' }], totalActiveUsers: 0 });
    await expect(fetchDistricts()).rejects.toMatchObject({ kind: 'contract' });
  });

  it('distinguishes server errors from missing resources', async () => {
    respondWith({}, 503);
    await expect(fetchDistricts()).rejects.toMatchObject({ kind: 'server', status: 503 });
    respondWith({}, 404);
    await expect(fetchDistricts()).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('reports an unreachable API as a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(fetchDistricts()).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('describeApiError', () => {
  it('gives human copy for every failure kind without leaking internals', () => {
    for (const kind of ['network', 'timeout', 'not_found', 'server', 'contract'] as const) {
      const { title, detail } = describeApiError(new ApiError(kind, 'internal-message', 500));
      const copy = `${title} ${detail}`;
      expect(title.length).toBeGreaterThan(10);
      expect(copy).not.toContain('internal-message');
      expect(copy).not.toContain('not_found');
    }
  });
});
