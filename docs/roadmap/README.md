# Knovra Office roadmap

Knovra Office is a virtual office where remote and hybrid teams share one floor, so working from
home feels like being in the office. This folder is the single source of truth for delivery: every
session, human or agent, starts here.

## How to use this plan

1. Find the first phase in the table below whose status is not **Done**.
2. Open its file in `phases/` and paste the **Prompt** block into a new session.
3. The phase is done only when its **Exit gate** passes by running it, not when the work "looks done".
4. Update the status table, the RAID log and the decision log in this file in the same PR.
5. One phase at a time. The next phase starts only after the previous gate passes and its PR is merged.

## Baseline (verified 2026-10-10)

| Item        | State                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Build       | `npm run build` passes (tsc + Vite). Main JS chunk is 1.0 MB (283 KB gzip) |
| Tests       | None                                                                       |
| CI          | None                                                                       |
| Lint/format | None                                                                       |
| Backend     | None. Colleagues, presence and voice are simulated in the browser          |
| Data        | Hard-coded in `src/world/layout.ts`                                        |
| Hosting     | Local dev only                                                             |
| Branches    | `feat/office-virtual-office-prototype` (prototype, not pushed or merged)   |
| Archive     | Previous product at tag `archive/knovra-v1`                                |

## Phases

A phase is a unit of risk retired. Sizes are relative (S ≈ 1–2 sessions, M ≈ 3–5, L ≈ 6–10) until
velocity is measured. Re-forecast after Phase 1.

| #   | Phase                                                             | Retires the risk that…                             | Size | Status            |
| --- | ----------------------------------------------------------------- | -------------------------------------------------- | ---- | ----------------- |
| 00  | [Floor prototype](phases/00-floor-prototype.md)                   | the idea doesn't feel like an office               | M    | Done (PR #3)      |
| 01  | [Foundation and quality bar](phases/01-foundation.md)             | we can't change code safely                        | M    | Done (PR #5)      |
| 02  | [Accounts, orgs and data model](phases/02-accounts-and-data.md)   | the office can't be owned by a real team           | L    | Gate met, PR open |
| 03  | [Real-time presence](phases/03-realtime-presence.md)              | people can't see each other live                   | L    | Not started       |
| 04  | [Proximity voice and video](phases/04-proximity-voice.md)         | walk-up conversation doesn't work for real         | L    | Not started       |
| 05  | [Rooms, chat and etiquette](phases/05-rooms-and-etiquette.md)     | it feels intrusive or chaotic                      | M    | Not started       |
| 06  | [Office designer](phases/06-office-designer.md)                   | each company can't make the office its own         | L    | Not started       |
| 07  | [Buildings, floors and campus](phases/07-buildings-and-campus.md) | it can't model a real IT hub with tenants          | L    | Not started       |
| 08  | [Hybrid bridge](phases/08-hybrid-bridge.md)                       | in-office and remote people stay split             | M    | Not started       |
| 09  | [Feels like home](phases/09-feels-like-home.md)                   | it is useful but not warm                          | M    | Not started       |
| 10  | [Mobile and performance](phases/10-mobile-and-performance.md)     | it is unusable on phones and laptops without a GPU | M    | Not started       |
| 11  | [Production readiness and beta](phases/11-production-and-beta.md) | it isn't safe or reliable enough for a real team   | L    | Not started       |
| 12  | [City map arrival (optional)](phases/12-map-arrival.md)           | the outer "arrive at the hub" layer adds no value  | M    | Not started       |

## Critical path

01 Foundation → 02 Accounts → 03 Presence → 04 Voice → 11 Production. Everything else has slack
and can move without moving the beta date. Phase 04 is the riskiest technically; it gets a
timeboxed spike during Phase 03 (see the Phase 03 file).

## External dependencies (start in week one)

| Dependency                                                    | Needed by                    | Owner | Next action                                                                                                  |
| ------------------------------------------------------------- | ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| LiveKit Cloud project (or self-hosted LiveKit) and API keys   | 03 spike, 04                 | Owner | Create free project, store keys in `.env.local`                                                              |
| OIDC provider (Google Workspace / Microsoft Entra) client IDs | 02 (code done), real sign-in | Owner | Register OAuth apps; redirect URI `{APP_ORIGIN}/auth/google/callback`. Until then only dev sign-in is tested |
| Postgres host (Neon / Supabase / RDS)                         | 11                           | Owner | Not needed for development: PGlite is used locally and in tests                                              |
| Hosting for web and real-time server (Fly.io / Render / AWS)  | 11                           | Owner | Choose by Phase 10                                                                                           |
| Google Maps Platform key with Map Tiles API                   | 12 only                      | Owner | Not needed unless Phase 12 is approved                                                                       |

## RAID log

| Type       | Entry                                                                                                                                                                                  | Owner | Next action / date                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| Risk       | WebRTC voice quality and cost at 50+ people per floor. High impact, medium likelihood. Mitigation: SFU (LiveKit), subscribe only to nearby tracks                                      | Owner | Spike in Phase 03                                |
| Risk       | 3D is too heavy for low-end laptops and phones. Mitigation: performance budget in Phase 01, low-quality mode in Phase 10                                                               | Owner | Budget set in Phase 01                           |
| Risk       | People feel watched. Mitigation: status is user-set only, no activity tracking, no location by default, privacy review in Phase 11                                                     | Owner | Stored data listed in docs/privacy.md (Phase 02) |
| Assumption | Teams want a spatial office more than a chat tool. Test: 5-person pilot uses it for a full week                                                                                        | Owner | End of Phase 05                                  |
| Assumption | One floor holds ~60 avatars at 60 fps on a mid-range laptop. Test: load scene with 60 bots in Phase 03                                                                                 | Owner | Phase 03                                         |
| Dependency | LiveKit keys                                                                                                                                                                           | Owner | Before Phase 03 spike                            |
| Risk       | Real Google/Microsoft sign-in has never run end to end (no OAuth apps yet). Medium impact. Mitigation: code follows openid-client v6 PKCE flow; test against a real tenant before beta | Owner | When OAuth apps exist                            |
| Risk       | PGlite (dev/test) and hosted Postgres may differ. Low impact. Mitigation: same migrations; run the API suite against real Postgres in Phase 11 CI                                      | Owner | Phase 11                                         |

## Decision log

| Date       | Decision                                                                              | Options considered                                   | Why                                                                                                 | Decided by        |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| 2026-10-10 | Reuse the knovra repo; archive v1 at tag `archive/knovra-v1`                          | New repo / reuse                                     | Keeps one repo and history                                                                          | Owner             |
| 2026-10-10 | Stylised avatars built from primitives                                                | Ready Player Me realistic / stylised                 | Warmer "home" feel, light on phones                                                                 | Owner             |
| 2026-10-10 | Phase 01 adds A* pathfinding for walk-to (not in the original scope)                  | Leave walk-to broken / fix now                       | The e2e gate showed walk-to got stuck on furniture; it is a bug in existing behaviour               | Owner (free hand) |
| 2026-10-10 | Use PGlite (Postgres in Node) for local dev and tests; real Postgres via DATABASE_URL | Docker Postgres / hosted dev DB / PGlite             | Docker was not running and no hosted DB exists yet; PGlite runs the same migrations with zero setup | Owner (free hand) |
| 2026-10-10 | Development sign-in (email only) for local and e2e, disabled in production            | Wait for OAuth apps / OIDC stub server / dev sign-in | Unblocks Phase 02 without external accounts; production guard is unit-tested                        | Owner (free hand) |
| 2026-10-10 | Product focus is presence for remote and hybrid work; GPS map is optional (Phase 12)  | Map-first / presence-first                           | Remote people don't commute to the hub; tracking feels like surveillance                            | Owner             |

## Status report template

```
Overall: GREEN | AMBER | RED, one sentence why
Gate: <phase>: <exit gate>: <met / not met + evidence>
Done since last report: <demonstrable outcomes>
Next: <committed work>
Decisions needed: <item, options, recommendation, decide by>
Forecast: <range> (changed from <previous> because <reason>)
```
