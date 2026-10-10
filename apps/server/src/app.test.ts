import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('server', () => {
  it('reports health', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
