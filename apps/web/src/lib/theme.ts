'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark' | 'contrast';

export const THEME_STORAGE_KEY = 'kynetra-theme';
const THEME_EVENT = 'kynetra-theme-change';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'contrast', label: 'High contrast' },
];

/**
 * Runs before first paint (inlined in <head>) so a stored theme never flashes.
 * Kept as a string because it must execute before React hydrates.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'||t==='contrast'){document.documentElement.dataset.theme=t}}catch(e){}`;

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark' || value === 'contrast';
}

function readPreference(): ThemePreference {
  const value = document.documentElement.dataset.theme ?? null;
  return isPreference(value) ? value : 'system';
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the theme
    // still applies for this visit, it just won't be remembered.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function useThemePreference(): [ThemePreference, (value: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribe, readPreference, () => 'system' as const);
  const set = useCallback((value: ThemePreference) => applyTheme(value), []);
  return [preference, set];
}

/** Fires when anything that changes resolved token values changes. */
export function subscribeToThemeTokens(onChange: () => void) {
  const queries = ['(prefers-color-scheme: light)', '(prefers-contrast: more)'].map((q) =>
    window.matchMedia(q),
  );
  queries.forEach((q) => q.addEventListener('change', onChange));
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    queries.forEach((q) => q.removeEventListener('change', onChange));
    window.removeEventListener(THEME_EVENT, onChange);
  };
}
