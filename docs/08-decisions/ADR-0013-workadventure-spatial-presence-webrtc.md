# ADR-0013: WorkAdventure-Style Spatial Presence, Proximity WebRTC & In-World Zones

Status: Accepted  
Date: 2026-09-22  
Owners: Frontend & Realtime Engineering Teams  

## Context
Kynetra required an interactive virtual office experience replicating the collaborative spatial dynamics of WorkAdventure (`https://github.com/din-esh-kumar/workadventure` / WorkAdventure open-source virtual office). Key functional requirements included:
1. Multi-peer spatial presence in 3D (avatars navigating zones, workstations, and meeting rooms).
2. Dynamic proximity video and audio chat using WebRTC/PeerJS where audio attenuates with physical distance and video bubbles appear when coworkers enter proximity.
3. Designated collaborative zones:
   - **All-Hands Agora** (`meeting` zone): automatic group video conference for all occupants.
   - **Deep Focus Acoustic Pod** (`silent` zone): muting ambient proximity calls to preserve concentration during deep engineering tasks.
   - **Cyber Cafe & Social Lounge** (`lounge` zone): informal breakout space.
   - **Engineering Workstation Bay** (`workstation` zone): IDE docking and incident triage.
4. Comprehensive WorkAdventure HUD:
   - Bottom floating Action Bar with Mic, Camera, Screen Share, animated Emote Wheel, Spatial Chat, and Coworker Directory with one-click teleportation.
   - Floating Proximity Video Bubbles with voice activity detection (green pulsing rings) and high-res screen share expansion.
   - Dual-channel spatial chat (Proximity Whisper vs District All-Hands).

## Decision
1. **Contract-Driven Presence (`packages/contracts`)**:
   - Introduced canonical schemas and types: `SpatialPeerSchema`, `SpatialZoneSchema`, `SpatialChatMessageSchema`, `SpatialEmoteSchema`.
2. **Client-Side WebRTC Mesh & Spatial Audio Engine (`apps/web`)**:
   - Integrated `peerjs` for P2P media streaming and low-latency state coordination without proprietary cloud vendor lock-in.
   - Leveraged standard Web Audio API (`AudioContext`, `AnalyserNode`) for hardware Voice Activity Detection (VAD) and distance-based audio attenuation.
   - Embedded an interactive Virtual Coworker Engine with animated canvas streams to provide instant, standalone demonstration and offline testing.
3. **In-World Spatial 3D Enhancements (`apps/web/src/components/3d/`)**:
   - Enhanced Three.js canvas to render remote coworkers as articulated voxel avatars with role badges and live speaking indicators.
   - Added visual floor demarcations and holographic billboards for Meeting, Focus, and Lounge zones.
4. **Fastify Backend Presence API (`services/api`)**:
   - Exposed canonical REST endpoints for spatial zones (`/api/v1/presence/zones`), active peers (`/api/v1/presence/peers`), and presence heartbeats (`/api/v1/presence/heartbeat`).

## Consequences
- **Zero Third-Party Cloud Dependencies**: Full WebRTC audio, video, and screen sharing operate out-of-the-box in the browser.
- **Immediate Interactive Feedback**: Standalone developers and students can immediately test proximity video bubbles and spatial audio through simulated teammates.
- **Modularity**: Adheres strictly to Kynetra's contracts-first architecture and passes all typechecks and unit tests.
