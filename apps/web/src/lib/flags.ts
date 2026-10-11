/**
 * Feature flags (starter prompt §36). Values come from build-time env so a
 * flag can be switched off per environment without a code change.
 * `on` / `off` override the default; anything else keeps it.
 */
export type FeatureFlag = '3d-world';

// Each env var is referenced literally so Next.js can inline it at build.
const OVERRIDES: Record<FeatureFlag, string | undefined> = {
  '3d-world': process.env.NEXT_PUBLIC_FLAG_3D_WORLD,
};

const DEFAULTS: Record<FeatureFlag, boolean> = {
  '3d-world': true,
};

export function resolveFlag(defaultValue: boolean, override: string | undefined): boolean {
  if (override === 'on') return true;
  if (override === 'off') return false;
  return defaultValue;
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return resolveFlag(DEFAULTS[flag], OVERRIDES[flag]);
}
