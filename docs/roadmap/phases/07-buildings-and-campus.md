# Phase 07: Buildings, floors and campus

**Branch:** `feat/buildings-floors-campus`
**Depends on:** Phase 06.

## Goal
Model a real IT hub: a campus of buildings, each with floors leased to different companies, which
people can move between.

## In scope
1. **Roles:**
   - Building owner (manages buildings, floors and leases), tenant admin (designs within the lease),
     member and visitor.
   - An owner console to create buildings and floors, draw rentable areas, and assign leases.
2. **Campus scene:** a stylised hub campus (buildings, paths, trees, plaza). Click a building to see
   its tenants by floor, then enter.
3. **Building lobby and lift:** a lobby with reception and a lift panel listing the floors you're
   allowed on. Lift transition animation, then load the floor scene (each floor is a separate
   lazy-loaded scene).
4. **Shared spaces:** building-wide spaces (cafeteria, events hall) where people from different
   tenants can meet if both orgs opt in.
5. **Access rules:** you can't enter another tenant's floor without an invite. Visitors are limited
   to lobby and invited rooms.
6. **Presence across scenes:** the people list shows where colleagues are (floor, room, campus).
   "Go to" walks or teleports there.

## Out of scope
Real-world maps (Phase 12).

## Exit gate
- e2e: the owner creates a building with 2 floors and leases floor 2 to org B. A member of org A can't
  enter floor 2 (blocked with a clear message). An org B member enters through lobby → lift →
  floor 2.
- Scene switch from lobby to floor takes 1.5 s or less on the reference laptop (measured).

## Prompt
```
Execute Phase 07 from docs/roadmap/phases/07-buildings-and-campus.md, following
docs/roadmap/PROMPT_RULES.md. Load the software-architect and
security-engineer skills. Add building-owner/tenant roles with an owner
console for buildings, floors, rentable areas and leases; a campus scene;
lobby and lift navigation with lazy-loaded floor scenes; opt-in shared
spaces; access rules; and cross-scene presence. Add the e2e and timing
measurements in the gate. Do not merge.
```
