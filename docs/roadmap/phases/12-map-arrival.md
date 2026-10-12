# Phase 12: City map arrival (optional)

**Branch:** `feat/map-hub-arrival`
**Depends on:** Phase 07. **Needs owner approval first:** costs (Google Map Tiles API billing) and privacy.

## Goal

An optional outer layer: see the IT hub on a photoreal 3D city map, and "arrive" into the campus.

## In scope

1. **Map:** Google Photorealistic 3D Tiles through `3d-tiles-renderer` in R3F (or CesiumJS), with the
   required attribution and logo.
2. **Arrival flight:** from the city view, the camera flies to the hub, then transitions into the
   stylised campus scene.
3. **Optional live travel (opt-in only):**
   - On a phone, share your location while travelling to the hub. Your avatar follows the route from
     the Routes API on the map.
   - Location is never stored beyond the trip, is never shown to anyone you didn't choose, and stops
     automatically at arrival.
4. **Geofence arrival:** within 150 m of the hub (server-checked), offer "Check in at the office"
   (ties into Phase 08 check-in).
5. **Cost guardrails:** tile request caching, a monthly budget alert, and a kill switch flag.

## Out of scope

Continuous background tracking and location history.

## Exit gate

- The owner approves the cost estimate and privacy note before work starts (recorded in the decision log).
- e2e with mocked geolocation: opting in shows the moving avatar, entering the geofence offers
  check-in, and declining opt-in never calls the geolocation API.
- Monthly tile cost for 100 daily users is estimated and recorded.

## Prompt

```
Only run after I approve the cost and privacy note for Phase 12.
Execute Phase 12 from docs/roadmap/phases/12-map-arrival.md, following
docs/roadmap/PROMPT_RULES.md. Load the security-engineer and
creative-webgl-shaders skills. Add the photoreal 3D tiles map with proper
attribution, the arrival flight into the campus, opt-in trip sharing that
is never stored, a server-checked geofence that offers check-in, and cost
guardrails with a kill switch. Add the mocked-geolocation e2e. Do not merge.
```
