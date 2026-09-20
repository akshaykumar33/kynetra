<!--
Fill every section. Write "N/A — reason" rather than deleting one.
An unfilled template is an automatic request-for-changes.
See prompts/starter_prompt.md §15 and §17.7.
-->

## What

<!-- Brief description of the change -->

## Why

<!-- Architectural or product rationale. Link the issue: Closes #123 -->

## Architecture Impact

- [ ] Modifies contracts in `packages/contracts`
- [ ] Requires new environment variables (`.env.example` updated)
- [ ] Includes database migrations
- [ ] Adds a Tier 2 dependency (language, database, broker, platform) — ADR linked below

## Screenshots / Video

<!--
Required for ANY UI change. "It looks fine on my machine" is not evidence.
- before and after
- light and dark
- mobile and desktop
- the five states (loading, empty, error, stale, populated)
-->

## UI/UX Checklist

<!-- §13.2. Mark N/A for non-UI changes. -->

- [ ] Responsive at 360 / 768 / 1280 / 1920 px, no horizontal body scroll
- [ ] Light, dark and high-contrast themes correct
- [ ] Contrast meets WCAG 2.2 AA, verified with a tool
- [ ] Keyboard-only pass completes every task; focus visible, trapped in modals, restored on close
- [ ] Screen-reader labels on all controls; live regions for async status
- [ ] `prefers-reduced-motion` honored
- [ ] Five states implemented for new data-bound components
- [ ] No dead UI — every control does something real
- [ ] Zero console errors or warnings

## Testing

<!-- Commands actually run, with real output. Never claim a command passed without running it. -->

```
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## Performance

<!-- Bundle impact, query counts, frame budget for 3D. Measured, not guessed. -->

## Security

- [ ] Secret scan clean (`pnpm run secret-scan`)
- [ ] No `.env`, keys, dumps or real user data committed
- [ ] `.env.example` updated if new variables were introduced
- [ ] Inputs validated at runtime boundaries (Zod)
- [ ] Authorization checked before sensitive data is returned

## Accessibility

<!-- What you verified beyond the checklist above -->

## Documentation

<!-- Which docs/ files changed. CHANGELOG.md updated? -->

## Migration

<!-- Steps required to adopt this change, or N/A -->

## Rollback

<!-- How to undo this safely -->

## Checklist

- [ ] Branched from up-to-date `main`; no direct commits to `main`
- [ ] Conventional Commit title (it becomes the squash commit)
- [ ] `git diff --cached` reviewed before each commit; nothing blind-staged
- [ ] Commits are atomic and each leaves the repo working
- [ ] Lint, typecheck, tests and build green locally **and** in CI
- [ ] Self-review performed on the PR diff page (§17.8)
- [ ] Branch will be deleted on merge
