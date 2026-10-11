# Virbela Benchmark & Virtual Campus Feature Specification

Reference: [Virbela](https://www.virbela.com/) (and Virbela Go browser runtime)  
Owner request: _"https://www.virbela.com/ this is how the features should have been — add it in as a plan to check this site and work on this"_

---

## 1. Executive Summary

Virbela is the enterprise benchmark for 3D immersive virtual workplaces and events. While Knovra started with a lean, single-floor office presence model, Virbela demonstrates how spatial software becomes an indispensable daily workplace:

1. **Rich Spatial Diversity**: Moving seamlessly between private offices, open team suites, all-hands auditoriums, expo halls, and outdoor social plazas.
2. **In-World Presentation**: Projecting live screens, slides, and websites onto physical 3D monitors and stage boards instead of relying solely on 2D pop-up overlays.
3. **Acoustic Boundary Isolation**: Visual circular carpets and meeting pods where entering creates an automatic private audio bubble without requiring closed doors.
4. **Interactive Seating & Expressive Presence**: Clicking chairs to sit down, raising hands for Q&A, waving, and cheering.
5. **Presenter Broadcast / Megaphone**: Allowing stage speakers in large auditoriums or town halls to project their voice across the entire venue regardless of distance attenuation.
6. **Fast-Travel Teleportation**: Instant directory-based navigation to any room, building, or colleague.

This document analyzes Virbela's feature set and defines how Knovra will adopt, implement, and verify these capabilities.

---

## 2. Virbela Feature Architecture vs. Knovra Mapping

| Feature Domain                         | Virbela Specification                                                                                                             | Knovra Current State                                                | Knovra Implementation Target                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **In-World Presentation Displays**     | Physical 3D presentation screens in boardrooms & auditoriums display live WebRTC screen shares, slides, and web content.          | Screen share is displayed as a floating 2D HUD window modal.        | Attach LiveKit `remoteVideoTrack` to a Three.js `VideoTexture` rendered on the physical 3D conference room & auditorium wall monitors. |
| **Auditorium & Town Hall**             | Large-scale theater with raised stadium seating, a raised stage, podium, multiple projection screens, and audience seating.       | Single floor layout with standard 4/6 desk pods.                    | Dedicated Auditorium scene reachable via Campus / Lift, with 60+ seats, stage, podium, and presentation boards.                        |
| **Presenter Megaphone (Broadcast)**    | Presenters on stage or podium can toggle "Broadcast / Megaphone" mode to reach everyone in the auditorium regardless of distance. | Pure linear/smoothstep proximity attenuation (3.2 m in, 4.0 m out). | Role-based / stage-zone audio rule: avatars in the presenter zone bypass distance falloff for everyone in that venue.                  |
| **Acoustic Private Zones**             | Meeting pods and circular lounge rugs with visual boundaries; entering isolates audio from the surrounding space.                 | Walls and closed meeting rooms with raycast occlusion.              | Geometric zone triggers: avatars inside a defined perimeter only hear/talk to peers inside that perimeter.                             |
| **Interactive Seating (Click-to-Sit)** | Click on any desk chair, lounge sofa, or auditorium seat to smoothly lerp into a seated pose.                                     | Avatars remain standing; click-to-walk paths around chairs.         | Chair interaction points with seated height offset, rotation alignment, and sit/stand state transitions.                               |
| **Avatar Emotes & Q&A**                | Emote actions: Raise Hand (adds to speaker queue), Clap, Wave, Thumbs Up, Cheer, Dance.                                           | Avatars walk and face movement direction; no gestures.              | HUD emote palette + avatar gesture animations (head nod, waving arm, raised hand indicator over avatar).                               |
| **Fast-Travel Teleport & Directory**   | Minimap / Directory list with 1-click teleport to any room, building, or colleague ("Go to Lena").                                | Navigation via walking, entering buildings, and taking lifts.       | Directory fast-travel: click a colleague or room in the HUD to instantly teleport to the destination.                                  |
| **Walkable Campus & Social Plazas**    | Outdoor spaces (plazas, benches, green parks, water features) where teams take casual walks or meet informally.                   | IT Park campus is an external view with clickable towers.           | Walkable outdoor plaza between towers with paths, benches, and outdoor seating pods.                                                   |

---

## 3. Detailed Technical Blueprint for Knovra

### 3.1 In-World 3D Video Wall Screens

- **Current Limitation**: Users see screen shares in a 2D floating HUD overlay (`hud/Voice.tsx`). This breaks spatial immersion.
- **Implementation**:
  - In `world/Office.tsx` and the Auditorium, define screen meshes with a dedicated screen material.
  - When a colleague shares their screen via LiveKit, attach the HTML `<video>` element of the incoming video track to a Three.js `VideoTexture`:
    ```ts
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    meshMaterial.map = videoTexture;
    meshMaterial.needsUpdate = true;
    ```
  - Double-clicking the in-world screen allows zooming in or popping out to full screen for accessibility.

### 3.2 Acoustic Huddle Zones (Audio Bubbles)

- **Current Limitation**: Any open-space conversation in the lounge bleeds into nearby desks unless users walk into an enclosed meeting room.
- **Implementation**:
  - In `packages/shared/src/layout.ts`, define `Zone` entities with `type: 'acoustic-bubble' | 'room' | 'open'`.
  - In `packages/shared/src/voice.ts`, update `voiceTargets`:
    - If user $A$ is inside an acoustic bubble, $A$'s voice targets ONLY include colleagues inside the _same_ acoustic bubble.
    - Avatars outside the bubble cannot hear audio originating from inside the bubble.

### 3.3 Interactive Seating & Gesture Emotes

- **Current Limitation**: Avatars only stand and walk. Meeting rooms feel like standing circles.
- **Implementation**:
  - Add `seats: { x: number; y: number; z: number; rotation: number }[]` to furniture layout schemas.
  - Hovering a chair displays a cursor prompt: "Sit here". Clicking walks the avatar to the chair and transitions their posture to seated.
  - Emote action bar:
    - **Raise Hand**: displays a floating 3D badge above the avatar and notifies the meeting/room host.
    - **Clap / Thumbs Up / Wave**: triggers a visual animation and sound cue.

### 3.4 Town Hall Auditorium with Presenter Megaphone

- **Implementation**:
  - Create `world/Auditorium.tsx` with sloped seating steps, stage, podium, and dual presentation screens.
  - In `apps/server/src/realtime/` and `apps/web/src/voice.ts`:
    - When an avatar is at the podium or has host broadcast enabled, their audio track subscription is forced at full volume for all room attendees, bypassing proximity falloff.

### 3.5 Quick-Travel Teleportation

- **Implementation**:
  - In `hud/Hud.tsx`, add a "Directory & Map" panel.
  - Selecting any floor zone, room, or online colleague offers:
    - **Walk to**: uses A* pathfinding.
    - **Teleport to**: instantly moves presence position to the target coordinates.

---

## 4. Phased Execution Roadmap

- **Phase 13A**: In-World 3D Presentation Screens (LiveKit video onto 3D room monitors).
- **Phase 13B**: Acoustic Huddle Zones (Private audio bubbles on open-space carpets).
- **Phase 13C**: Interactive Seating & Emote System (Click-to-sit + Raise hand / Wave / Clap).
- **Phase 13D**: Town Hall Auditorium & Presenter Megaphone (Stage, stadium seating, broadcast audio).
- **Phase 13E**: Fast-Travel Directory & Walkable Campus Plaza.
