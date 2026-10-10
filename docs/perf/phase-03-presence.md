# Phase 03 measurements: live presence

Measured on 2026-10-10 on the development machine: Windows 11, AMD Radeon 740M integrated GPU
(ANGLE / Direct3D 11), Node 24, the API and web dev servers on the same machine.

## Server: 60 bots walking on one floor

`node scripts/load-presence.mjs 60 90` against `npm run dev:server` (in-memory database).

| Metric                             | Result                   | Target  |
| ---------------------------------- | ------------------------ | ------- |
| Members in the room                | 61 (60 bots + 1 browser) | 60      |
| Tick time p50                      | 2.0 ms                   |         |
| Tick time p95                      | **3.2 ms**               | < 20 ms |
| Tick time max                      | 9.2 ms                   |         |
| Messages delivered to bots in 90 s | 52,805                   |         |

A tick builds one delta snapshot of everyone who moved and sends it to every socket (serialised once).

## Client: frame rate with 60 live colleagues

`node scripts/measure-fps.mjs` in a visible 1440×900 Chromium window, during a 60-bot run.

| Build                                                          | fps (10 s average)   | Target |
| -------------------------------------------------------------- | -------------------- | ------ |
| Before tuning                                                  | 42.4, 45.2, 45.1     | ≥ 50   |
| Hair and feet stop casting shadows, soft-shadow samples 10 → 6 | 51.6                 |        |
| Also remove per-frame `ContactShadows`                         | **55.0, 52.3, 55.9** | ≥ 50   |

`ContactShadows` re-rendered the whole scene (every avatar included) plus blur passes every frame.
The directional light's shadow map still grounds furniture and avatars.

The worst single frame stayed around 50 ms in every run (one long frame per 10 s, likely garbage
collection or name-tag layout). Phase 10 picks this up along with instancing and name-tag culling.

## Network: move latency between two browsers

From the Playwright test `two people see each other move, focus, talk and leave`: time from Lena's
avatar moving in her tab to the move arriving in Sam's tab, both on this machine.

| Metric       | Result     | Target   |
| ------------ | ---------- | -------- |
| Move latency | **102 ms** | < 300 ms |

This includes up to one 100 ms send interval and one 100 ms snapshot interval. Remote avatars are
then drawn 120 ms in the past (`INTERP_DELAY_MS`) so motion stays smooth through jitter.

## Not measured

- Real networks (only localhost). Latency over the internet adds the round trip.
- Phones and laptops other than the one above. Phase 10 adds the reference device matrix.
