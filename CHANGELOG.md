# Changelog

All notable changes to the Kynetra platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-24
### Added
- **Cadastral Plots, Company Headquarters & Workspace Progression**:
  - Implemented the three-tier spatial architectural progression: **Plots** ➔ **Company** ➔ **Workspace**.
  - **Outdoor Plot Estate Environment**:
    - Modeled 6 fenced land parcel plots arranged around asphalt municipal avenues and crossroads with sidewalks, manicured green hedges, and roadside conical street trees.
    - Each plot features perimeter curbs, corner boundary posts with gold caps, fence railings, and orange triangular surveyor flags.
    - Configured default spawn at **Plot #1 (Founder's Innovation Plot)** with glowing spawn pad beacon.
  - **Corporate Company Headquarters**:
    - Modeled modern multi-tier corporate building matching reference image: teal/cyan walls, modern angled blue shed roof with white facia trim, flat-roof annex with rooftop HVAC, floor-to-ceiling glass entrance facade, porch steps, and blue entrance canopy awning.
    - Added outdoor Campus Directory Signboard with interactive map and stylized avatars in front of the building.
  - **Seamless Stage Progression & Portals**:
    - Users spawn at Plot #1 outdoors, walk along the municipal avenue, approach the Company Headquarters entrance, and press `[E]` or click to enter the interior Workspace.
    - Fixed indoor/outdoor visual occlusion: Grouped interior office elements into a dedicated workspace container that reveals the complete corporate floor (desks, server racks, meeting agora, cafe lounge, and Aria AI concierge) when entering the company workspace, while concealing the exterior building shell that previously occluded the interior.
    - Inside the workspace, users can access workstations, IDE workbench, executive suite, coding pods, and use the exit door `[E]` to step back out to the plots.
    - Added top HUD stage breadcrumb: `[📍 1. Plots (Spawn)]` ➔ `[🏢 2. Company HQ]` ➔ `[💻 3. Workspace]` for fast travel.
  - **45° Overhead Isometric View & Screen-Aligned Movement**:
    - Re-architected default camera perspective to classic mathematical axonometric / isometric projection (45° horizontal azimuth, ~35.5° elevation pitch, 28m overview elevation).
    - Aligned keyboard movement vectors with the isometric screen orientation (W/Up moves directly up the screen, S/Down moves down, A/Left moves left, D/Right moves right).
  - **Physical Collision Resolution & Wall Sliding System**:
    - Created `WorldColliders.ts` defining precise bounding box and cylinder colliders for all outdoor and indoor structures:
      - Company HQ Teal Annex Wing and Main Wing walls (preventing clipping into the building exterior).
      - Directory kiosk, trees, roadside hedges, and perimeter plot fences.
      - Workspace interior glass perimeter walls, workstations, terminals, meeting agora table, and break lounge furniture.
    - Implemented axis-separated Minkowski swept collision resolution with smooth wall sliding in `AvatarController.ts`, completely stopping the player from clipping into walls, buildings, or obstacles.
  - **Reference Image Toolbar Tools**:
    - **2D / 3D Isometric View Toggle**: Switches between 45° isometric tilt camera (matching the reference artwork) and free 3D third-person follow orbit.
    - **Compass Rose**: Re-aligns camera to True North.
    - **Plot Surveyor Tool**: Overlays real-time parcel dimensions (width, depth, area in m², zoning classification) above every plot.
    - **Plot Deed Modal (`PlotDeedModal`)**: Interactive official cryptographic land deed certificate displaying parcel ownership, zoning, status, and fast-travel triggers.
  - **Contracts & Schema**:
    - Added `WorldPlotSchema` and `WorldPlot` contracts in `packages/contracts/src/world.ts`.
    - Added district plots in `services/api/src/data/world-state.ts`.

## [0.3.0] - 2026-09-22
### Added
- **Executive Admin Room & Master Computer Terminal**:
  - Constructed architectural Executive Admin Suite inside the 3D world: elevated obsidian dais, pure gold trim, tinted glass partition walls, brushed brass corner pillars, walk-in archway, server tower with status LEDs, and triple curved master display workstation (`node-admin-console`).
  - Added dedicated high-security spatial zone `zone-admin-suite` (`Executive Admin Workspace`) with zone detection and notifications.
  - Implemented `AdminUserManagementModal`: Full executive command console to view real PostgreSQL users, filter by role/search query, create new users, edit roles/status/XP, and delete user accounts.
  - Added HUD quick-access "Admin Users" button for admin role.
- **PostgreSQL User Administration API**:
  - Implemented Fastify admin routes in `services/api/src/routes/users.ts`:
    - `GET /api/v1/admin/users`: List all registered platform users from PostgreSQL.
    - `POST /api/v1/admin/users`: Create and persist real users with hashed passwords and default organization memberships.
    - `PUT /api/v1/admin/users/:id`: Real-time role and status updating (admin/architect/employee).
    - `DELETE /api/v1/admin/users/:id`: Safe account deletion with root administrator protection.
  - Added shared contracts in `packages/contracts/src/user.ts`: `AdminUserSchema`, `CreateUserRequestSchema`, `UpdateUserRequestSchema`.
  - Added comprehensive automated test suite `services/api/src/routes/users.spec.ts` (100% passing).

### Removed
- Completely removed all synthetic bot loops, simulated automated peers, hardcoded fake names (`Alex Rivera`, `student-alex`, `peer-sarah`, `peer-devon`), and mock users across `apps/web` and `services/api`. All presence, user displays, and video bubbles now reflect authentic PostgreSQL database identities and live WebRTC peers.

## [0.2.0] - 2026-09-22
### Added
- **WorkAdventure-Style Spatial Presence & Proximity WebRTC**:
  - Implemented PeerJS WebRTC P2P communication mesh with distance-based audio attenuation and Voice Activity Detection (VAD).
  - Designed WorkAdventure-style Proximity Video Bubbles overlay with live webcam/animated streams, speaking rings, and full-resolution screen share expansion modal.
  - Added bottom floating Action Bar with Mic mute/unmute, Camera toggle, Screen Share broadcast, animated 7-emoji Emote Wheel, and Coworker Directory.
  - Created dual-channel Spatial Chat drawer supporting Proximity Whisper (heard only within 7m earshot) and District All-Hands broadcast.
  - Designed interactive In-World Spatial Zones with glowing 3D floor perimeters: All-Hands Agora (`meeting`), Deep Focus Acoustic Pod (`silent`), Cyber Cafe & Lounge (`lounge`), and Workstation Bay (`workstation`).
  - Added Coworker Directory with one-click instant avatar teleportation.
  - Built interactive Virtual Coworker Engine (Sarah Chen, Devon Vance, Maya Lin) with live stream synthesis for offline and standalone operation.
  - Established canonical `@kynetra/contracts` schemas for `SpatialPeer`, `SpatialZone`, `SpatialChatMessage`, and `SpatialEmote`.
  - Added Fastify presence endpoints (`/api/v1/presence/zones`, `/api/v1/presence/peers`, `/api/v1/presence/heartbeat`).
  - Authored `ADR-0013: WorkAdventure-Style Spatial Presence, Proximity WebRTC & In-World Zones`.

## [0.1.0] - 2026-09-16

### Added
- **Phase 00 Foundation**: Established complete monorepo architecture with pnpm workspaces and Turborepo.
- **Documentation Architecture**: Implemented 103 comprehensive technical documents and 12 foundational Architecture Decision Records (ADRs).
- **Engineering Governance**: Created canonical `AGENTS.md`, `.ai/` workflows, specialized AI agent skills, and GitHub issue/PR templates.
- **Domain Contracts**: Scaffolded `@kynetra/contracts` with strongly typed Zod schemas for WorldDistricts, InnovationTower, Telemetry, and UserProfiles.
- **Platform Core API**: Implemented `@kynetra/api` with Fastify, exposing `/health/live`, `/health/ready`, `/api/v1/world/districts`, and `/api/v1/telemetry/stats`.
- **2D World Console**: Implemented `@kynetra/web` using Next.js 15 App Router featuring dark slate aesthetic, Kynetra Central district visualizer, Innovation Tower floor deck, interactive node inspector, and system diagnostics HUD.
- **DevOps & Infrastructure**: Configured `docker-compose.yml` for PostgreSQL 16 (pgvector), Redis 7, and Jaeger/OTel, plus GitHub Actions CI workflow.
