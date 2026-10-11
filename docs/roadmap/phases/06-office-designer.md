# Phase 06: Office designer

**Branch:** `feat/office-designer`
**Depends on:** Phase 02 (data model). Can start after Phase 03 if Phase 04/05 are blocked on externals.

## Goal

An org admin designs their own office inside the floor area they rent, by drag and drop, and
publishes it to everyone.

## In scope

1. **Editor:**
   - A 2D top-down canvas: grid snapping, pan and zoom, and the leased area outlined. Placement
     outside the lease is impossible.
   - A live 3D preview pane.
2. **Catalogue:**
   - Desks, desk pods (2/4/6), chairs, sofas, tables, plants, kitchen, whiteboard, wall segments,
     doors, glass walls and screens.
   - Rooms (meeting, focus booth, lounge, town hall) as zone tools.
3. **Interactions:**
   - Drag, rotate (R), duplicate (Ctrl+D), delete, multi-select, and align/distribute.
   - Undo and redo (command pattern).
   - Keyboard-accessible alternatives for every action.
4. **Rules:**
   - Collision between items and minimum walkway width (1.0 m).
   - Every desk must be reachable from the entrance (pathfinding check).
   - Rooms need a door. Warnings are shown inline.
5. **Versioning:** save drafts and publish a version (`floor_layout` rows). Members on the floor get
   the new layout live, and anyone standing inside a moved item is nudged to the nearest free spot.
   Roll back to any version.
6. **Desk assignment:** drag a person onto a desk, or mark it as a hot desk.
7. **Templates:** "Startup 20", "Agency 40" and "Engineering 80" to start from.

## Out of scope

Building owner tools (Phase 07) and custom 3D model uploads.

## Exit gate

- Unit tests for the placement rules: inside lease, collisions, walkway width and reachability.
- e2e: the admin builds a small office from a template, moves a pod, adds a meeting room and
  publishes. A member's open floor updates without reload. Rollback restores the previous layout.
- A member (non-admin) gets 403 on the designer API.

## Prompt

```
Execute Phase 06 from docs/roadmap/phases/06-office-designer.md, following
docs/roadmap/PROMPT_RULES.md. Load the ux-research, accessibility and
ui-design skills. Build a 2D drag-and-drop designer constrained to the
leased area with a 3D preview, an item catalogue, undo/redo, validation
(collisions, walkway width, reachability, doors), versioned
publish/rollback that updates live floors, desk assignment and templates.
Add the unit and e2e tests in the gate, including a 403 for non-admins.
Do not merge.
```
