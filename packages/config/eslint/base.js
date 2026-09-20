// Shared ESLint flat config for all TypeScript packages in the monorepo.
// Consumed via `@kynetra/config/eslint/base`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Paths that are generated, vendored, or otherwise not ours to lint. */
export const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/build/**',
  '**/out/**',
  '**/*.d.ts',
];

export const base = tseslint.config(
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // typescript-eslint disables `no-undef` for .ts files (the compiler does a
    // better job), but plain .js/.mjs tooling still needs its globals declared.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      // AGENTS.md rule 4: strong typing, zero `any`.
      '@typescript-eslint/no-explicit-any': 'error',

      // Unused code is dead code (AGENTS.md rule 3). Underscore-prefixed
      // names are the documented opt-out for deliberately ignored bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Section 39.3: silently swallowed errors are banned. An empty catch
      // must be written as `catch (_e) { /* explained */ }` so the choice is
      // visible in review rather than invisible in production.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Section 13.2: no console noise. Warnings and errors survive because
      // they are how real failures surface.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Prefer explicit intent over silent coercion at runtime boundaries.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Tests exercise failure paths and mock freely; the production-code
    // constraints above get in the way without catching real bugs there.
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // Build tooling and hook scripts run in Node and legitimately log.
    files: ['**/*.config.js', '**/*.config.mjs', 'scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
);

export default base;
