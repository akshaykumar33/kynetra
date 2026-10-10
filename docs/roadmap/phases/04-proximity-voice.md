# Phase 04: Proximity voice and video

**Branch:** `feat/proximity-voice-video`
**Depends on:** Phase 03, and a "go" from the LiveKit spike.

## Goal

Walking up to someone starts a real conversation, and walking away ends it, with no call buttons.

## In scope

1. **Token service:** the server issues LiveKit tokens scoped to floor and room. Only org members can get one.
2. **Proximity subscription:**
   - Clients subscribe only to the audio of people within voice range (3.2 m) and in the same space
     (open floor vs a closed room).
   - Volume falls off with distance, with gentle panning.
   - Hysteresis (enter 3.2 m, leave 4.0 m) stops flicker at the edge.
3. **Team ambience:** inside your team zone, teammates are audible at low volume (configurable, off by default).
4. **Controls:**
   - Mute and camera toggles, device picker, push-to-talk (Space), and a speaking indicator on avatars.
   - Clear explanations when mic or camera permission is denied.
5. **Video bubbles:** optional camera bubbles above nearby avatars, and a grid view inside meeting rooms.
6. **Screen share** inside meeting rooms, shown on the room's wall screen.
7. **Focus means silence:** focusing users are never subscribed to or heard. Visitors get "leave a note".
8. **Quality:** echo cancellation, noise suppression, and adaptive bitrate. Reconnect without reload.

## Out of scope

Recording, transcription, and AI summaries.

## Exit gate

- e2e with fake media devices (`--use-fake-device-for-media-stream`): A walks to B and both are
  subscribed to each other's audio within 1 s. A walks away and both unsubscribe within 1 s. B sets
  Focus and A can't subscribe.
- Manual check, recorded in the PR: two real machines hold a 10-minute conversation; note latency
  and any dropouts.
- Unit tests for the subscription rules, including hysteresis and walls.

## Prompt

```
Execute Phase 04 from docs/roadmap/phases/04-proximity-voice.md, following
docs/roadmap/PROMPT_RULES.md. Load the multiplayer, security-engineer and
accessibility skills. Integrate LiveKit with a server token endpoint and
proximity-based subscription with distance falloff and hysteresis that
respects walls and Focus. Add mute/camera/device/push-to-talk controls,
camera bubbles, and screen share in meeting rooms. Add the fake-media e2e
and unit tests for the subscription rules. Do not merge.
```
