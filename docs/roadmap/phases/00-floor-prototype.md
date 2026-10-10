# Phase 00: Floor prototype

**Status:** Done, on branch `feat/office-virtual-office-prototype` (not yet merged).

## Goal

Show in minutes that a shared 3D floor feels like being in the office.

## What exists

- One floor: three team pods, your desk, kitchen and lounge, glass meeting room, reception.
- Stylised avatars built from primitives; 11 simulated colleagues with statuses and routines.
- WASD and click-to-move, collisions, camera follow.
- Walk-up conversation bar (simulated voice), focus notes, knock-to-enter, coffee-pair invite.
- People list with walk-to, your own status.

## Exit gate

`npm run build` passes and the app loads with no console errors. **Met** on 2026-10-10.

## Follow-ups (feed Phase 01)

- No tests, lint or CI.
- 1 MB main chunk.
- `layout.ts` mixes floor plan data with people data.

## Prompt

```
Push branch feat/office-virtual-office-prototype and open a PR to main titled
"feat(office): add phase 1 virtual office floor prototype", following
docs/roadmap/PROMPT_RULES.md rule 12. Do not merge without asking me.
```
