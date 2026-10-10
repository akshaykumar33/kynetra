# Phase 03: Real-time presence

**Branch:** `feat/realtime-floor-presence`
**Depends on:** Phase 02. **Spike inside this phase:** LiveKit spatial audio (timeboxed to 1 session).

## Goal
Everyone on a floor sees everyone else move, sit and change status live.

## In scope
1. **Room server:** Colyseus in `apps/server` (or a separate `apps/realtime`). One room per floor,
   joined with the session cookie (auth checked on join).
2. **State:** the server holds each member's position, facing, status, zone and `inRoomId`. The server
   is authoritative: it validates movement against the shared collision code and clamps speed.
3. **Sync:** clients send input or intended position at 10–15 Hz. The server broadcasts deltas.
   Clients interpolate remote avatars with a 100 ms buffer, and predict their own avatar with
   reconciliation.
4. **Presence lifecycle:** join → arrive at the entrance → walk to your desk (optional auto-walk).
   On disconnect, the avatar fades out after 30 s; on reconnect, it resumes. Idle handling only from
   explicit "away".
5. **Replace simulation:** remove simulated colleagues when real people are present. Keep demo bots
   behind `?demo=1`.
6. **Scale check:** a load script spawns 60 headless bot clients on one floor.
7. **Spike (timeboxed):** a LiveKit room with two browser tabs, where volume is set by distance.
   Write the findings in `docs/spikes/livekit-spatial.md`: latency, CPU, cost per user-hour,
   and a go/no-go for Phase 04.

## Out of scope
Voice in the product (Phase 04) and chat (Phase 05).

## Exit gate
- e2e: two browser contexts sign in as different users. User A walks; user B sees A's avatar move
  within 300 ms. A sets Focus; B sees it within 1 s. A closes the tab; B sees A leave within 35 s.
- The load script with 60 bots holds the server tick below 20 ms (p95) and the client at 50 fps or
  more on the reference laptop (record the numbers).
- The spike doc exists with a go/no-go.

## Prompt
```
Execute Phase 03 from docs/roadmap/phases/03-realtime-presence.md, following
docs/roadmap/PROMPT_RULES.md. Load the multiplayer and performance-engineer
skills. Build an authenticated Colyseus room per floor with
server-authoritative movement using the shared collision code, client
prediction and interpolation, and a presence lifecycle. Add the two-user
e2e and the 60-bot load script, and record real numbers. Run the
timeboxed LiveKit spatial-audio spike and write docs/spikes/livekit-spatial.md
with a go/no-go. Do not merge.
```
