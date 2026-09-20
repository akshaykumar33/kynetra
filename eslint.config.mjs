// Single source of truth for linting the whole monorepo.
//
// One root config rather than one per package: ESLint's flat config resolves
// from the current working directory, not from each file's location, so
// lint-staged (which runs from the repo root) needs a root config anyway.
// Keeping one file means the hook and CI cannot drift from each other.
import base from '@kynetra/config/eslint/base';
import { nextLayer } from '@kynetra/config/eslint/next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,

  // Next.js rules apply only to the web app.
  ...nextLayer.map((layer) => ({
    ...layer,
    files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
  })),

  {
    // The secret scanner's CLI is a console program; reporting findings to
    // stdout and stderr is its entire purpose.
    files: ['packages/secret-scan/src/cli.mjs'],
    rules: { 'no-console': 'off' },
  },
];
