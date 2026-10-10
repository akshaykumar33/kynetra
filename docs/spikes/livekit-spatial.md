# Spike: LiveKit for proximity voice

**Question:** can LiveKit carry Knovra's walk-up voice: everyone on a floor connected, each person
hearing only the people within 3.2 m, with volume falling off by distance?

**Timebox:** one session (2026-10-10). **Decision: GO**, with the conditions at the end.

## Setup

- `livekit-server` v1.13.9 (official Windows release, SHA-256 checked against the release's
  `checksums.txt`), run locally with `--dev`.
- Trial harness (kept out of the repo): `livekit-client` 2.22 in Chromium with fake microphones,
  `livekit-server-sdk` 2.19 issuing one token per person for one room per floor.
- Participants stand in a row 1 m apart. Each connects with `autoSubscribe: false` and subscribes
  only to people within 3.2 m, the model Phase 04 will use. Volume is
  `(1 - distance / 3.2) ^ 1.5` through `RemoteParticipant.setVolume`.
- Everything ran on one laptop (Windows 11, Ryzen with Radeon 740M), so server CPU shares the
  machine with up to three Chromium instances.

## Results

| Participants | Connect p50 / p95                | Mic published p50 / p95 | Subscriptions match voice range | Re-subscribe when walking back into range | Server CPU (one core) |
| ------------ | -------------------------------- | ----------------------- | ------------------------------- | ----------------------------------------- | --------------------- |
| 4            | 1964 / 2101 ms (first, cold run) | 2289 / 2468 ms          | yes                             | 53–58 ms                                  | 5.2%                  |
| 10           | 409 / 570 ms                     | 887 / 1122 ms           | yes                             | 49–55 ms                                  | 11.4%                 |
| 30           | 298 / 575 ms                     | 688 / 1304 ms           | yes                             | 51–59 ms                                  | 46.9%                 |

- **Selective subscription works exactly.** With 10 people, each subscribed to 3–6 others, which is
  precisely everyone in range. Nobody received audio from outside their bubble.
- **Walking up is instant once connected.** Subscribing to a person's existing track took about
  50 ms, far under the 1 s Phase 04 gate. So the design is: connect to the floor's voice room on
  arrival, and toggle subscriptions as people move. Don't connect per conversation; a fresh connect
  plus mic publish takes 0.7–2.5 s.
- **Server load grows with subscriptions, not with room size.** 30 people at ~5 subscriptions each
  used about half a core. Extrapolated, a 60-person floor needs roughly one core, and LiveKit spreads
  rooms across cores.

Not measured: real networks (only localhost, so RTT wasn't meaningful and isn't reported),
TURN relaying behind corporate firewalls, audio quality by ear, and phones.

## Cost

LiveKit Cloud pricing (livekit.com/pricing, read 2026-10-10): plans at $0 (Build), $50/mo (Ship) and
$500/mo (Scale), with 5,000 to 1.5M WebRTC participant minutes and 50 GB to 3 TB data transfer
included, then $0.12–$0.10 per GB.

An office is connected all day, which is the expensive shape. **Example:** 30 people × 8 h × 22 days
≈ 317,000 participant minutes a month. That's above Build and Ship, and inside Scale ($500/mo),
before bandwidth. Two controls keep this sane:

1. **Publish the microphone only while someone is in range.** Alone at your desk, your mic track is
   muted, so nothing flows. Opus DTX also cuts silence to almost nothing.
2. **Self-host for production.** The same open-source `livekit-server` binary we tested runs on our
   own servers. Then cost is compute and egress, not per-minute. Cloud stays an option for the beta.

## Decision: GO

Use LiveKit for Phase 04 with these conditions:

- **One voice room per floor, joined on arrival,** with `autoSubscribe: false`. Subscriptions follow
  the shared proximity rules (`nearbyIds`, plus hysteresis at 3.2 m in / 4.0 m out).
- **Tokens** come from our API, scoped to the floor's room, `canPublishSources: [MICROPHONE]` (plus
  camera and screen share where Phase 04 allows). In `livekit-server-sdk` 2.x this must be the
  `TrackSource` enum, not a string; strings throw.
- **The mic is muted when no one is in range.**
- **Self-hosted LiveKit is the production default;** Phase 11 sizes it. For local development, run
  `livekit-server --dev` (keys `devkey` / `secret`).
- **Before beta,** re-measure over a real network with TURN, on the Phase 10 device matrix.
