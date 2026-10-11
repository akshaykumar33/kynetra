# Phase 01: Foundation and quality bar

**Branch:** `chore/foundation-monorepo-quality`

## Goal

Make the codebase safe to grow: a monorepo shape ready for a server, automated checks on every PR,
and performance budgets we can measure.

## Why now

Phases 02–04 add a server, database and real-time code. Without tests and CI, every later phase
risks silently breaking the floor.

## In scope

1. **Monorepo with npm workspaces:**
   - `apps/web`: the current Vite app, moved here.
   - `apps/server`: empty Node 22 + TypeScript service with a `/health` endpoint (Fastify).
   - `packages/shared`: shared types (Status, Person, Zone, Desk, layout schema) and pure functions
     (`inRect`, `zoneAt`, proximity).
2. **Split the data:** move the floor plan into `packages/shared/src/layout/` as a typed,
   JSON-serialisable `FloorLayout` object. Validate it with zod. People stay as seed data in
   `apps/web/src/dev/seed.ts`.
3. **Tooling:** ESLint (typescript-eslint, react-hooks), Prettier, `.editorconfig`, and
   `.gitattributes` with `* text=auto eol=lf`.
4. **Tests:**
   - Vitest unit tests for `inRect`, `zoneAt`, collision `blocked()`, proximity and knock state
     transitions (extract these into pure functions in `packages/shared`).
   - Playwright e2e: the app loads, the HUD renders, pressing W moves the player (read through a
     `window.__office` debug hook exposed only in dev/test), and walking to Lena opens the
     conversation bar.
5. **CI:** GitHub Actions on PRs: install, lint, typecheck, unit, build, Playwright (Chromium),
   with npm caching.
6. **Performance budget:** code-split three/R3F (`manualChunks`), initial JS ≤ 350 KB gzip, and
   a `npm run budget` script that fails above it. Document the frame budget: 60 fps with 60 avatars
   on a mid-range laptop.
7. **Git hooks:** a lightweight pre-commit (lint-staged plus Prettier) through `simple-git-hooks`.

## Out of scope

Any new product feature, the server's real logic, or database work.

## Exit gate (all must pass)

```
npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run budget && npm run e2e
```

CI is green on the PR, and the floor behaves exactly as in Phase 00.

## Deliverables

Workspace layout, CI workflow, test suites, budget script, and an updated `CLAUDE.md` describing the
new layout.

## Prompt

```
Execute Phase 01 from docs/roadmap/phases/01-foundation.md, following
docs/roadmap/PROMPT_RULES.md. Restructure into an npm-workspaces monorepo
(apps/web, apps/server, packages/shared) without changing what the user
sees. Extract collision, zone and proximity logic into pure, unit-tested
functions in packages/shared. Add ESLint, Prettier, Vitest, Playwright, the
bundle budget script and a GitHub Actions workflow. Run the exit gate
command and paste its real output in the PR. Do not merge.
```
