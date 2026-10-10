# Knovra Office

A virtual office where remote and hybrid teams share one floor. People see who is in,
walk over to talk, knock on meeting rooms and meet in the lounge, so working from home
feels like being in the office.

Delivery plan: `docs/roadmap/README.md`. Every phase follows `docs/roadmap/PROMPT_RULES.md`.

## Stack

npm workspaces. Web: Vite + React 18 + TypeScript, React Three Fiber + drei, zustand.
Server: Fastify (Node 22). Shared: TypeScript + zod. Tests: Vitest (unit), Playwright (e2e).

## Layout

- `packages/shared/src/`: code the web app and the server both use. Pure and unit-tested.
  - `layout.ts`: floor plan data, types and the `FloorLayoutSchema` zod schema.
  - `movement.ts`: collision (`blocked`, `step`) and room membership.
  - `pathfinding.ts`: A* routes around furniture for click-to-walk.
  - `proximity.ts`: who can hear whom. `knock.ts`: meeting room door state.
- `apps/web/src/`
  - `world/`: 3D scene (`Floor`, `People` with player and colleagues, `Avatar`).
  - `hud/Hud.tsx`: 2D overlay.
  - `state.ts`: zustand store, per-frame positions, `walkTo`, and the dev-only `window.__office` hook for e2e.
  - `dev/seed.ts`: demo colleagues until Phase 02 loads real people.
- `apps/server/src/`: `app.ts` builds the Fastify app (tests use `inject`), `main.ts` listens.
- `e2e/`: Playwright specs. `scripts/check-budget.mjs`: initial JS budget (350 KB gzip).

## Commands

- `npm run dev`: web app. `npm run dev:server`: API on :4000.
- `npm run check`: lint + typecheck + unit tests + build + budget. `npm run e2e`: Playwright.

## Rules

- Game logic that is not rendering goes in `packages/shared` as pure functions with tests.
- Keep per-frame data (positions) out of React state; write to the store only when a value changes.
- Colleagues, presence and voice are simulated until Phases 03–04.
- Budgets: initial JS 350 KB gzip or less (enforced in CI); 60 fps with 60 avatars on a mid-range laptop.

## CodeGraph

If `.codegraph/` exists, use `codegraph_explore` before grep or reading whole files.
