# Knovra Office

A virtual office where remote and hybrid teams share one floor. People see who is in,
walk over to talk, knock on meeting rooms and meet in the lounge, so working from home
feels like being in the office.

Delivery plan: `docs/roadmap/README.md`. Every phase follows `docs/roadmap/PROMPT_RULES.md`.

## Stack

npm workspaces. Web: Vite + React 18 + TypeScript, React Three Fiber + drei, zustand.
Server: Fastify (Node 22), Drizzle ORM on Postgres (PGlite locally and in tests), OIDC sign-in. Shared: TypeScript + zod. Tests: Vitest (unit), Playwright (e2e).

## Layout

- `packages/shared/src/`: code the web app and the server both use. Pure and unit-tested.
  - `layout.ts`: floor plan data, types and the `FloorLayoutSchema` zod schema.
  - `movement.ts`: collision (`blocked`, `step`) and room membership.
  - `pathfinding.ts`: A* routes around furniture for click-to-walk.
  - `proximity.ts`: who can hear whom. `knock.ts`: meeting room door state.
  - `realtime.ts`: the live presence wire protocol (zod schemas both sides parse) and `acceptMove`, the server movement check.
- `apps/web/src/`
  - `world/`: 3D scene (`Floor`, `People` with player and colleagues, `Avatar`).
  - `hud/Hud.tsx`: 2D overlay.
  - `state.ts`: zustand store, per-frame positions, `walkTo`, and the dev-only `window.__office` hook for e2e.
  - `realtime.ts`: floor connection (reconnect with backoff), 10 Hz position sends, and `sampleAt` interpolation of remote avatars.
  - `api.ts`: typed API client (sends the CSRF header). `App.tsx`: sign-in → onboarding → office gate.
  - `screens/`: sign-in, onboarding and notice screens. The 3D office is lazy-loaded from `world/Office.tsx`.
- `apps/server/src/`
  - `app.ts` builds the Fastify app (tests use `inject`); `main.ts` migrates, optionally seeds, and listens.
  - `db/`: `schema.ts` (Drizzle), `client.ts` (Postgres or PGlite), `seed.ts` (Northgate demo), migrations in `apps/server/drizzle/`.
  - `auth/`: sessions (hashed tokens), OIDC and dev sign-in. `http/access.ts`: `requireMember`, the one org access check.
  - `realtime/`: `/realtime` WebSocket (session + Origin checked before upgrade) and `FloorRoom`, one live floor per org: 10 Hz delta snapshots, server-checked moves, 30 s reconnect grace.
  - `routes/api.ts`: `/api/v1`. Errors are always `{ error: { code, message } }`.
- `e2e/`: Playwright specs. `scripts/check-budget.mjs`: initial JS budget (350 KB gzip).

## Commands

- First time: `cp apps/server/.env.example apps/server/.env.local`.
- `npm run dev:server` (API on :4000, local PGlite in `apps/server/.data`) and `npm run dev` (web on :5173, proxies /api and /auth).
- `npm run db:migrate`, `npm run db:seed`. After editing `schema.ts`: `npm run db:generate -w @knovra/server`.
- `npm run check`: lint + typecheck + unit tests + build + budget. `npm run e2e`: Playwright.

## Rules

- Game logic that is not rendering goes in `packages/shared` as pure functions with tests.
- Keep per-frame data (positions) out of React state; write to the store only when a value changes.
- Every org route calls `requireMember` first. Never take user or org identity from the request body.
- Update `docs/privacy.md` with any change to what is stored.
- People, statuses and positions are live. `?demo=1` shows simulated colleagues instead. Voice is simulated until Phase 04.
- Positions are never persisted or logged.
- Perf checks: `npm run load:presence -- 60 90` (API running) and `npm run measure:fps` (web running). Results in `docs/perf/`.
- Budgets: initial JS 350 KB gzip or less (enforced in CI); 60 fps with 60 avatars on a mid-range laptop.

## CodeGraph

If `.codegraph/` exists, use `codegraph_explore` before grep or reading whole files.
