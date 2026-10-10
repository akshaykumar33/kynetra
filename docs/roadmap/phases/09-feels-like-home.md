# Phase 09: Feels like home

**Branch:** `feat/home-feel-personalisation`
**Depends on:** Phase 05.

## Goal

Turn a working tool into a place people like being in.

## In scope

1. **Avatar customiser:** body shape, skin, hair styles, outfits and accessories (glasses, headphones,
   hats), all stylised primitives or small glTF parts. Includes a preview turntable.
2. **Personal desk:** photos (uploaded, moderated, size-limited), plant type, mug, desk lamp and name
   plate. Others see it when they walk by.
3. **Rituals:**
   - Morning arrival greeting.
   - Real coffee pairs (opt-in, weekly matching across teams).
   - Birthdays and work anniversaries on the floor.
   - Friday social in the lounge.
4. **Ambience:** optional soft office sound (Web Audio, low volume, off by default), daylight that
   follows your local time, and weather in the windows.
5. **Emotes:** wave, high-five, thumbs-up and coffee cheers, with small animations.

## Out of scope

Paid cosmetics and marketplaces.

## Exit gate

- e2e: a user customises their avatar and desk, reloads, and another user sees the same look.
  An upload above the size limit or of the wrong type is rejected with a clear message.
- The pilot group rates "feels like being with my team" at 4/5 or higher in a short survey. Record the
  results in `docs/research/pilot-2.md`.

## Prompt

```
Execute Phase 09 from docs/roadmap/phases/09-feels-like-home.md, following
docs/roadmap/PROMPT_RULES.md. Load the ui-design, motion-design,
sound-designer and security-engineer skills. Add the avatar customiser,
personal desk decor with safe validated uploads, rituals (arrival
greeting, opt-in coffee pairs, celebrations), optional ambience, and
emotes. Keep everything opt-in and reduced-motion aware. Add the e2e tests
in the gate and the pilot survey template. Do not merge.
```
