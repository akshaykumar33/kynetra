import { describe, expect, it } from 'vitest';
import { ROOM } from './layout';
import { VOICE_ENTER, VOICE_LEAVE, voiceTargets, voiceVolume } from './voice';

const me = { x: 0, z: 5 };
const at = (dx: number): [string, { x: number; z: number }] => ['b', { x: dx, z: 5 }];
const none = new Set<string>();

describe('voiceTargets', () => {
  it('hears someone who walks into range', () => {
    expect([...voiceTargets(me, 'available', [at(VOICE_ENTER - 0.1)], { b: 'available' }, none)]).toEqual(['b']);
  });

  it('does not start hearing someone just outside the enter distance', () => {
    expect(voiceTargets(me, 'available', [at(VOICE_ENTER + 0.1)], { b: 'available' }, none).size).toBe(0);
  });

  it('keeps hearing someone between the enter and leave distances (no flicker)', () => {
    const between = (VOICE_ENTER + VOICE_LEAVE) / 2;
    expect(voiceTargets(me, 'available', [at(between)], { b: 'available' }, new Set(['b'])).has('b')).toBe(true);
    expect(voiceTargets(me, 'available', [at(between)], { b: 'available' }, none).has('b')).toBe(false);
  });

  it('stops once they walk past the leave distance', () => {
    expect(voiceTargets(me, 'available', [at(VOICE_LEAVE + 0.1)], { b: 'available' }, new Set(['b'])).size).toBe(0);
  });

  it('never connects to someone focusing or away, even close up', () => {
    expect(voiceTargets(me, 'available', [at(1)], { b: 'focus' }, none).size).toBe(0);
    expect(voiceTargets(me, 'available', [at(1)], { b: 'away' }, none).size).toBe(0);
  });

  it('connects you to nobody while you focus', () => {
    expect(voiceTargets(me, 'focus', [at(1)], { b: 'available' }, new Set(['b'])).size).toBe(0);
  });

  it('does not carry through the meeting room walls', () => {
    const inside = { x: ROOM.x, z: ROOM.z + ROOM.d / 2 - 0.5 };
    const outside = { x: ROOM.x, z: ROOM.z + ROOM.d / 2 + 0.6 };
    expect(voiceTargets(outside, 'available', [['b', inside]], { b: 'meeting' }, none).size).toBe(0);
  });

  it('lets people inside the meeting room hear each other', () => {
    const a = { x: ROOM.x, z: ROOM.z };
    const b = { x: ROOM.x + 1, z: ROOM.z };
    expect(voiceTargets(a, 'meeting', [['b', b]], { b: 'meeting' }, none).has('b')).toBe(true);
  });
});

describe('voiceVolume', () => {
  it('is loudest up close and quiet near the edge', () => {
    expect(voiceVolume(0)).toBe(1);
    expect(voiceVolume(2)).toBeGreaterThan(voiceVolume(3));
    expect(voiceVolume(VOICE_LEAVE)).toBe(0.05);
  });
});
