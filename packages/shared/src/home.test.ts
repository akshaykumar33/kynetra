import { describe, expect, it } from 'vitest';
import { dayPhase, decorFor, HOME_STYLES, HomeDecorSchema, NoteSchema, NOTE_MAX, readDecor } from './home';

describe('decor', () => {
  it('gives every style a valid starting look', () => {
    for (const style of HOME_STYLES) expect(HomeDecorSchema.parse(decorFor(style)).style).toBe(style);
  });

  it('hands out copies, so editing one home never changes the defaults', () => {
    decorFor('loft').items.push('aquarium');
    expect(decorFor('loft').items).not.toContain('aquarium');
  });

  it('falls back to the cabin for missing or broken stored decor, and drops duplicate items', () => {
    expect(readDecor(null)).toEqual(decorFor('cabin'));
    expect(readDecor({ style: 'castle' })).toEqual(decorFor('cabin'));
    expect(readDecor({ style: 'neon', wall: '#000000', items: ['sofa', 'sofa'] }).items).toEqual(['sofa']);
  });

  it('only accepts a #rrggbb wall colour', () => {
    expect(HomeDecorSchema.safeParse({ style: 'loft', wall: 'red', items: [] }).success).toBe(false);
    expect(HomeDecorSchema.safeParse({ style: 'loft', wall: 'url(x)', items: [] }).success).toBe(false);
  });
});

describe('dayPhase', () => {
  it('follows the clock around the day', () => {
    expect([5, 6, 9, 10, 16, 17, 19, 20, 23, 0].map(dayPhase)).toEqual([
      'night',
      'morning',
      'morning',
      'day',
      'day',
      'golden',
      'golden',
      'night',
      'night',
      'night',
    ]);
  });
});

describe('guestbook notes', () => {
  it('trims, and refuses empty or overlong notes', () => {
    expect(NoteSchema.parse({ text: '  hi!  ' }).text).toBe('hi!');
    expect(NoteSchema.safeParse({ text: '   ' }).success).toBe(false);
    expect(NoteSchema.safeParse({ text: 'x'.repeat(NOTE_MAX + 1) }).success).toBe(false);
  });
});
