# Phase 05: Rooms, chat and etiquette

**Branch:** `feat/rooms-chat-etiquette`
**Depends on:** Phase 04.

## Goal

Make the office polite: closed doors mean something, quick messages don't need a walk, and nobody
feels ambushed.

## In scope

1. **Real knock:** the knock reaches the people inside, who see "Arjun is knocking" with Let in / Not now.
   Doors can be open, closed or locked. A meeting has a host.
2. **Room booking:** book a room for a time slot, show the booking on the door, and optionally sync
   with Google or Microsoft calendars (read-only free/busy).
3. **Text chat:**
   - Direct messages, a team channel and a "nearby" channel. Persisted, with unread counts.
   - Mentions can be linked to "walk to them".
4. **Notes on desks:** leave a note for a focusing or away person; they see it when they return.
5. **Spaces:** a lounge open to all, a town hall auditorium (stage, audience seating, raise hand),
   and team stand-up corners.
6. **Etiquette rules:**
   - Rate-limit knocks and pings.
   - Block and report a user. Admins can remove someone from the floor.
   - "Do not disturb until …" timers.
7. **Pilot:** run a 5-person, one-week pilot. Collect friction notes in `docs/research/pilot-1.md`.

## Out of scope

Office designer, multiple buildings.

## Exit gate

- e2e: a knock is shown to the host and "Let in" opens the door for the knocker only. "Not now" shows
  the knocker a polite message. Sending a DM shows an unread badge for the recipient, and reading it
  clears the badge.
- Pilot notes exist with at least 5 participants' feedback, and the top 3 issues are logged as
  follow-ups.

## Prompt

```
Execute Phase 05 from docs/roadmap/phases/05-rooms-and-etiquette.md, following
docs/roadmap/PROMPT_RULES.md. Load the ux-research and accessibility
skills. Make knocking real (host accepts or declines), add room states and
booking, persisted DMs/team/nearby chat with unread counts, desk notes,
town hall with raise-hand, and etiquette controls (rate limits,
block/report, DND timers). Add the e2e tests in the gate and prepare the
pilot notes template. Do not merge.
```
