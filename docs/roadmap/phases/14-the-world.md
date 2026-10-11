# Phase 14: The world

**Branch:** `feat/world-hierarchy` (slice 1), then one branch per slice.
**Depends on:** Phases 02–04 (accounts, presence, voice). Absorbs Phase 07's campus and Phase 12's
idea of arriving somewhere bigger than one office.

## Goal

One small world that holds everyone: a single person, an owner, their organisations and their
teams. You sign in and stand somewhere in it — at home if you belong to no company yet — and every
place has a clear rule for who may walk in.

```text
world → district → building → floor → org (lease) → team zone → desk
                 ↘ home (one per person)
```

| Place                     | District    | Who may enter                                             | Who runs it          |
| ------------------------- | ----------- | --------------------------------------------------------- | -------------------- |
| Plaza, Town Hall, café    | commons     | Everyone signed in                                        | Nobody (world rules) |
| Tower streets and lobbies | business    | Everyone signed in                                        | Nobody               |
| An org's floor            | business    | That org's members and guests                             | Org owner and admins |
| A team zone               | business    | Everyone in the org (a neighbourhood, not a locked room)  | Org owner and admins |
| A home                    | residential | Its owner, invited guests, everyone if the owner opens it | Its owner only       |

The rules live in one place, `packages/shared/src/world.ts` (`canEnter`, `canManage`), so the web
app and server can never disagree.

## Slices

1. **Model and API (this branch, done).** Districts on buildings, `home` and `home_invite`
   tables, commons buildings in the seed, every person gets a home on first visit,
   `GET /api/v1/world` returns the whole map plus where you belong. Campus directory stays
   business-only.
2. **World scene.** A 3D world view: the commons plaza in the middle, the IT park towers to the
   north, the residential street to the south. Land at home (no org) or at your tower (with one).
   Breadcrumb from `describe()`. Walk or fast-travel between districts; doors refuse with
   `canEnter`'s reason.
3. **Homes.** Enter your home, open/close it, invite people, and talk to visitors (reuse the
   proximity voice room per home).
4. **Owners and orgs.** Found an organisation from the world (you become owner), lease a free floor
   in a tower, create teams, assign team zones, invite people.
5. **Commons life.** Town Hall events (ties into Phase 13 auditoriums), café drop-in tables, world
   presence counts per district.

## Exit gate (whole phase)

- A brand-new person with no invite signs in, lands at their home, walks to the commons, and can't
  enter a company floor (clear message, no 500).
- An owner founds an org, leases a floor, creates two teams and invites a member; the member lands
  at the org's floor in their team zone.
- `canEnter` is the only access rule for places; the server's checks call it. Unit tests cover
  every row of the table above.
- 60 fps on a mid-range laptop with all districts loaded; initial JS stays under budget.
- `docs/privacy.md` lists everything new that is stored.
