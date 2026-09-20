/**
 * Conventional Commits enforcement — prompts/starter_prompt.md §17.1.
 *
 * The type list matches the branch-type table in §16.2, so a branch prefix and
 * its commit type are always the same vocabulary.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'design',
        'docs',
        'test',
        'chore',
        'infra',
        'security',
        'ai',
        'revert',
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'body-max-line-length': [1, 'always', 100],
  },
};
