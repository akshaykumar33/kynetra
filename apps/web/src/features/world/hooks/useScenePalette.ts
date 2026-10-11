'use client';

import { useEffect, useState } from 'react';
import { subscribeToThemeTokens } from '@/lib/theme';

const SCENE_TOKENS = {
  sky: '--scene-sky',
  ground: '--scene-ground',
  grid: '--scene-grid',
  gridMajor: '--scene-grid-major',
  road: '--scene-road',
  building: '--scene-building',
  buildingActive: '--scene-building-active',
  tower: '--scene-tower',
  glass: '--scene-glass',
  accent: '--scene-accent',
  warn: '--scene-warn',
  sun: '--scene-sun',
  hemiSky: '--scene-hemi-sky',
  hemiGround: '--scene-hemi-ground',
  zenith: '--scene-zenith',
  horizon: '--scene-horizon',
  windowGlow: '--scene-window-glow',
  foliage: '--scene-foliage',
  headlight: '--scene-headlight',
  taillight: '--scene-taillight',
} as const;

export type SceneMood = 'dusk' | 'day';

export type ScenePalette = Record<keyof typeof SCENE_TOKENS, string> & { mood: SceneMood };

function readPalette(): ScenePalette {
  const styles = getComputedStyle(document.documentElement);
  const colors = Object.fromEntries(
    Object.entries(SCENE_TOKENS).map(([key, token]) => [
      key,
      styles.getPropertyValue(token).trim(),
    ]),
  ) as Omit<ScenePalette, 'mood'>;
  const mood: SceneMood = styles.getPropertyValue('--scene-mood').trim() === 'day' ? 'day' : 'dusk';
  return { ...colors, mood };
}

/** The 3D scene's colours, read from the same design tokens as the 2D UI. */
export function useScenePalette(): ScenePalette | null {
  const [palette, setPalette] = useState<ScenePalette | null>(null);
  useEffect(() => {
    const update = () => setPalette(readPalette());
    update();
    return subscribeToThemeTokens(update);
  }, []);
  return palette;
}
