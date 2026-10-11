import { describe, expect, it } from 'vitest';
import { resolveFlag } from './flags';

describe('resolveFlag', () => {
  it('lets the environment switch a flag either way', () => {
    expect(resolveFlag(true, 'off')).toBe(false);
    expect(resolveFlag(false, 'on')).toBe(true);
  });

  it('keeps the default for unset or unrecognised values', () => {
    expect(resolveFlag(true, undefined)).toBe(true);
    expect(resolveFlag(false, 'yes')).toBe(false);
  });
});
