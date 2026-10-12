import { describe, expect, it } from 'vitest';
import { desks, SPAWN } from './layout';
import { acceptMove, ClientMessage, TICK_MS } from './realtime';

describe('acceptMove', () => {
  it('accepts a normal walking step', () => {
    expect(acceptMove(SPAWN, { x: SPAWN.x + 0.3, z: SPAWN.z }, TICK_MS)).toBe(true);
  });
  it('rejects teleporting across the floor', () => {
    expect(acceptMove(SPAWN, { x: -15, z: -10 }, TICK_MS)).toBe(false);
  });
  it('allows a longer step after a longer gap, such as a slow frame', () => {
    expect(acceptMove(SPAWN, { x: SPAWN.x + 3, z: SPAWN.z }, 1000)).toBe(true);
  });
  it('rejects standing inside furniture', () => {
    const d = desks[0];
    expect(acceptMove({ x: d.x, z: d.z + 1.2 }, { x: d.x, z: d.z }, TICK_MS)).toBe(false);
  });
});

describe('ClientMessage', () => {
  it('accepts a well-formed move', () => {
    expect(ClientMessage.safeParse({ t: 'move', seq: 1, x: 0, z: 12, ry: 0 }).success).toBe(true);
  });
  it('rejects positions outside the floor', () => {
    expect(ClientMessage.safeParse({ t: 'move', seq: 1, x: 500, z: 0, ry: 0 }).success).toBe(false);
  });
  it('rejects setting a status only the server may set', () => {
    expect(ClientMessage.safeParse({ t: 'status', status: 'meeting' }).success).toBe(false);
  });
  it('rejects unknown message types', () => {
    expect(ClientMessage.safeParse({ t: 'admin', x: 1 }).success).toBe(false);
  });
});
