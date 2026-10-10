# Phase 10: Mobile and performance

**Branch:** `perf/mobile-low-end-mode`
**Depends on:** Phase 07.

## Goal
It runs well on phones and on laptops without a dedicated GPU.

## In scope
1. **Profiling first:** measure CPU/GPU frame time, draw calls and memory on 3 reference devices
   (mid-range Android, iPhone, an integrated-GPU laptop). Record the numbers before changing anything.
2. **Rendering:**
   - Instanced furniture and avatars.
   - Merged static geometry and level of detail (LOD) for avatars.
   - Name tags only for nearby people; everyone else shows as a dot.
   - Adaptive pixel ratio, and shadows off on the low tier.
3. **Quality tiers:** automatic detection plus a manual setting (High / Balanced / Battery saver).
4. **Mobile UX:** touch joystick, tap-to-walk, bottom-sheet HUD, safe areas, landscape support, and
   44 px touch targets.
5. **PWA:** installable, with an offline shell and an offline state. Opt-in push notifications for
   knocks and DMs.
6. **2D fallback:** a lightweight top-down floor for devices without WebGL2, with the same features.

## Out of scope
Native apps.

## Exit gate
- On each reference device (numbers in the PR): 60 avatars on the floor at 45 fps or more on Balanced,
  and the floor is usable within 4 s on a 4G profile.
- An e2e on a mobile viewport (Playwright device emulation) completes walk-up-to-talk using touch.

## Prompt
```
Execute Phase 10 from docs/roadmap/phases/10-mobile-and-performance.md, following
docs/roadmap/PROMPT_RULES.md. Load the performance-engineer,
performance-profiling and responsive-design skills. Profile first on the
reference devices and record numbers, then add instancing, merged static
geometry, avatar LOD, adaptive quality tiers, mobile touch controls and
bottom-sheet HUD, PWA install and opt-in push, and a 2D fallback floor.
Prove the gate with measured numbers. Do not merge.
```
