'use client';

import { useSyncExternalStore } from 'react';

let cached: boolean | null = null;

function detect(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

const noopSubscribe = () => () => {};

/**
 * `null` during SSR/hydration (unknown), then whether this device can render
 * the 3D lens. The 2D lens never depends on it.
 */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, detect, () => null);
}
