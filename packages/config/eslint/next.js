// Shared ESLint flat config for Next.js apps.
// Consumed via `@kynetra/config/eslint/next`.
//
// Replaces `next lint`, which is deprecated in Next.js 15, removed in 16, and
// drops into an interactive prompt in CI when no config is present.
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import { base } from './base.js';

/**
 * The Next-specific layer on its own, with no `files` key, so callers can
 * scope it to an app directory from a monorepo-root config.
 */
export const nextLayer = [
  {
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      // App Router only — there is no `pages/` directory to cross-check.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

/** Base plus the Next layer, for linting from inside an app directory. */
export const next = [...base, ...nextLayer];

export default next;
