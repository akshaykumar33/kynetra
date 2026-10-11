# Phase 08: Hybrid bridge

**Branch:** `feat/hybrid-office-bridge`
**Depends on:** Phase 04 (voice).

## Goal

People in the physical office and people at home share one floor, with no "remote second class".

## In scope

1. **Check-in:** a QR code at the real office door (a signed, rotating code), or an optional office
   Wi-Fi check. Checked-in people show "In office" on their avatar. Checking in is always opt-in and
   expires at the end of the day.
2. **Desk booking:** book a physical desk and the matching virtual desk together. Show a weekly view of
   who is in when ("Lena and Noah are in on Thursday").
3. **Office display mode:** a kiosk view for a TV in the real office that shows the live virtual floor.
   Remote people can wave to it, and in-office people can tap to start a call.
4. **Meeting room bridge:** pair a physical meeting room's device so it joins the virtual room as one
   participant.
5. **Insights for admins:** aggregated, anonymised occupancy by day only. No per-person tracking reports.

## Out of scope

Badge-system integrations and hardware.

## Exit gate

- e2e: scanning a valid QR code (simulated) marks the user In office; an expired or forged code is
  rejected. Booking a desk shows it in the weekly view for teammates.
- Display mode runs for 8 hours in a soak test without memory growing past 20% (measured).

## Prompt

```
Execute Phase 08 from docs/roadmap/phases/08-hybrid-bridge.md, following
docs/roadmap/PROMPT_RULES.md. Load the security-engineer and ux-research
skills. Add opt-in office check-in via signed rotating QR codes, combined
physical+virtual desk booking with a weekly "who is in" view, an office
display (kiosk) mode with wave/tap-to-call, meeting room device pairing,
and aggregated anonymous occupancy for admins. Add the e2e tests and the
8-hour soak measurement. Do not merge.
```
