# Phase 02: Accounts, orgs and data model

**Branch:** `feat/server-accounts-data-model`
**Depends on:** Phase 01. External: OIDC dev apps, Postgres dev database.

## Goal
A real company can sign in and see its own people on its own floor, instead of hard-coded data.

## In scope
1. **Database:** Postgres with Drizzle ORM and migrations in `apps/server/db/`.
   - Tables: `organization`, `user`, `membership` (role: owner | admin | member | guest), `team`,
     `building`, `floor` (rentable area polygon), `lease` (org ↔ floor area), `floor_layout`
     (versioned JSON validated by the shared zod schema), `desk_assignment`, `invite`.
   - Index the foreign keys, use `created_at`/`updated_at`, and soft-delete users.
2. **Auth:** OIDC sign-in (Google Workspace and Microsoft Entra) with Arctic or Auth.js on the server.
   Sessions are httpOnly, Secure, SameSite=Lax cookies. Add CSRF protection on mutating routes and
   a magic-link invite flow for guests.
3. **API:** a versioned REST API (`/api/v1`) on Fastify with zod validation and typed responses shared
   from `packages/shared`:
   - `GET /me`
   - `GET /orgs/:id/floor` (layout plus people)
   - `PATCH /me/status`
   - `GET/POST /orgs/:id/invites`
   - The error shape is `{ error: { code, message } }`.
4. **Authorization:** every query is scoped by organization. Members only see their own org's floors.
   Write tests that prove org A can't read org B.
5. **Web:** a sign-in page, an onboarding step (pick your desk, team and avatar colours), and the floor
   loading from the API. TanStack Query for fetching. A loading state and an error state.
6. **Seed script:** `npm run db:seed` creates the demo org "Northgate" that matches the prototype.
7. **Privacy by design:** document in `docs/privacy.md` what is stored. No activity tracking.
   Status is user-set only.

## Out of scope
Live presence, voice, and the designer.

## Exit gate
```
npm run db:migrate && npm run db:seed && npm test && npm run e2e
```
The e2e suite signs in with a test OIDC stub, completes onboarding, sees seeded colleagues from
the database, changes status, and the change persists after reload. The authorization test
(org A ↛ org B) passes.

## Prompt
```
Execute Phase 02 from docs/roadmap/phases/02-accounts-and-data.md, following
docs/roadmap/PROMPT_RULES.md. Load the data-engineer, security-engineer
and api-designer skills. Add Postgres + Drizzle schema and migrations, OIDC
sign-in with secure cookie sessions, a zod-validated /api/v1 on Fastify
scoped by organization, onboarding in the web app, and a seed matching the
Northgate demo floor. Include an e2e that signs in through an OIDC stub and
an authorization test proving cross-org reads fail. Do not merge.
```
