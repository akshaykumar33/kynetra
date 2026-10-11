# Phase 13: Virbela virtual campus features

**Branch:** `feat/virbela-campus-features`  
**Depends on:** Phase 04 (Voice) and Phase 07 (Campus/Buildings).  
**Benchmark Reference:** [Virbela](https://www.virbela.com/) and [docs/research/virbela-benchmark.md](../research/virbela-benchmark.md).

## Goal

Elevate Knovra to the enterprise standard proven by Virbela: in-world 3D presentation screens, town hall auditoriums with presenter broadcast, acoustic private huddle bubbles, interactive seating, avatar emotes, and fast-travel directory teleportation.

## In scope

1. **In-World Presentation Screens:**
   - Conference room and auditorium wall monitors render live WebRTC screen shares directly onto 3D `VideoTexture` meshes.
   - Click to focus/zoom the screen in 3D, with an optional 2D accessibility pop-out.
2. **Town Hall Auditorium:**
   - Dedicated auditorium space with a presentation stage, podium, dual projection screens, and tiered stadium seating.
   - Reachable from the campus directory and lift.
3. **Presenter Megaphone (Broadcast Audio):**
   - Presenter mode for speakers on stage or at podiums: voice bypasses distance attenuation and broadcasts to all attendees in the venue.
4. **Acoustic Private Zones (Audio Bubbles):**
   - Open-space meeting pods and lounge rugs with clear visual boundaries that create an isolated audio bubble (people inside talk privately; outsiders cannot overhear).
5. **Interactive Seating (Click-to-Sit):**
   - Desks, conference chairs, and auditorium seats can be clicked to walk up and sit down with an authentic seated avatar posture.
6. **Avatar Emotes & Q&A:**
   - Emote palette: Raise Hand (queues participant for Q&A, displays 3D indicator), Clap, Wave, Thumbs Up.
7. **Fast-Travel Teleport & Directory:**
   - 1-click teleport to any room, zone, or online colleague from the HUD directory.

## Out of scope

Real-world GPS map tiles (Phase 12). Custom glTF avatar file upload marketplace.

## Exit gate

- e2e: a presenter shares their screen; another user standing in the meeting room sees the screen rendered on the 3D wall display with zero page errors.
- e2e: two users step onto an acoustic huddle rug; a third user standing 2.5 m away outside the perimeter cannot hear them (audio volume = 0). Stepping out restores proximity audio.
- e2e: a user clicks a chair, sits down, and raises their hand; the room host sees the raised hand notification and badge above the avatar.
- Bundle budget: web initial bundle remains within the 350 KB gzip budget; 60 fps maintained in the auditorium scene.

## Prompt

```
Execute Phase 13 from docs/roadmap/phases/13-virbela-virtual-campus-features.md, following
docs/roadmap/PROMPT_RULES.md. Load the ui-design, motion-design, sound-designer,
software-architect and accessibility skills. Consult docs/research/virbela-benchmark.md.
Implement 3D in-world presentation screens (VideoTexture on wall monitors), the town
hall auditorium with presenter broadcast megaphone, acoustic huddle audio bubbles,
interactive click-to-sit furniture, avatar emotes with Q&A raise-hand, and directory
teleportation. Add the e2e tests in the gate and ensure performance budgets pass. Do not merge.
```
