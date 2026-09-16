# Kynetra — The Open Digital IT World

[![CI Pipeline](https://github.com/akshaykumar33/kynetra/actions/workflows/ci.yml/badge.svg)](https://github.com/akshaykumar33/kynetra/actions/workflows/ci.yml)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Enabled-ef4444.svg)](https://turbo.build/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Kynetra** is a persistent virtual technology city that mirrors meaningful procedures and operational workflows of the real technology industry.

Within Kynetra, developers and autonomous AI agents collaborate, participate in software engineering standups, resolve real-time cloud incidents, compete in algorithmic coding arenas, and build software systems together across an interconnected virtual metropolis.

---

## The Vision: Procedural Realism First

Unlike traditional metaverses focused exclusively on visual avatars or speculative tokens, Kynetra prioritizes **system and procedural realism**:
- **Code Actually Executes**: Workstations and battle pods connect to real containers and cloud sandboxes.
- **Incidents Have Root Causes**: SRE and cybersecurity simulations inject real latency, packet loss, and CVEs.
- **Unified World Platform**: 2D web, 3D WebGL/WebGPU, mobile, and XR are different projection lenses over a single authoritative world state.
- **Efficiency Parity**: Never force a user to navigate a 3D city for actions that take one click in the 2D operations console.

---

## Repository Map

```
.
├── apps/
│   └── web/                   # Next.js 15 2D world console, district viewer & Innovation Tower HUD
├── services/
│   └── api/                   # Core platform Fastify API service (health, telemetry, world state)
├── packages/
│   ├── contracts/             # Canonical domain contracts, DTOs, and Zod validation schemas
│   └── config/                # Shared TypeScript and tooling configuration
├── docs/                      # Complete 12-section technical documentation & ADR repository
│   ├── 00-vision/             # Product vision, principles, personas, terminology
│   ├── 01-product/            # Product requirements, user journeys, experience specs
│   ├── 02-architecture/       # System context, containers, world engine, realtime, AI
│   ├── 03-design/             # Design tokens, typography, motion, 3D art direction
│   ├── 04-engineering/        # Language standards (TS, Next, Nest, Go, Rust, Python)
│   ├── 05-ai/                 # AI gateway, agent orchestration, RAG, safety guardrails
│   ├── 06-devops/             # Environments, local dev, CI/CD, AWS, Terraform, OpenTelemetry
│   ├── 07-security/           # Threat models, OAuth/OIDC, RBAC, secrets management
│   ├── 08-decisions/          # Architecture Decision Records (ADR-0001 to ADR-0012)
│   ├── 09-phases/             # Evolutionary roadmap (Phase 00 Foundation to Phase 10 Scale)
│   ├── 10-runbooks/           # Incident response, rollback, and disaster recovery procedures
│   └── 11-research/           # Competitive landscape, technical benchmarks, references
├── .ai/                       # AI coding agent memory, workflows, and specialized skills
├── .github/                   # CI workflows, PR templates, issue templates, dependabot
├── AGENTS.md                  # Canonical AI Engineering Constitution
└── docker-compose.yml         # Local development environment (Postgres 16 + pgvector, Redis 7, Jaeger)
```

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) >= 20.x
- [pnpm](https://pnpm.io/) >= 10.x
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL and Redis)

### 1. Clone & Install
```bash
git clone https://github.com/akshaykumar33/kynetra.git
cd kynetra
pnpm install
```

### 2. Start Local Infrastructure
```bash
docker compose up -d
```

### 3. Run Quality Verification
```bash
# Run unit and integration tests across all packages
pnpm run test

# Run strict TypeScript compiler checks
pnpm run typecheck

# Build all applications and packages
pnpm run build
```

### 4. Start Development Servers
```bash
pnpm run dev
```
- **Web World Console**: [http://localhost:3000](http://localhost:3000)
- **Platform Core API**: [http://localhost:4000](http://localhost:4000)
- **API Health Check**: [http://localhost:4000/health/ready](http://localhost:4000/health/ready)
- **Jaeger Telemetry UI**: [http://localhost:16686](http://localhost:16686)

---

## Architecture Decisions (ADRs)

Key architectural decisions are documented in [`docs/08-decisions/`](./docs/08-decisions/):
- **[ADR-0001](./docs/08-decisions/ADR-0001-monorepo-pnpm-turbo.md)**: Polyglot monorepo using pnpm workspaces and Turborepo.
- **[ADR-0002](./docs/08-decisions/ADR-0002-modular-monolith-first.md)**: Modular monolith architecture before microservices.
- **[ADR-0003](./docs/08-decisions/ADR-0003-web-application-stack.md)**: Next.js 15 App Router & modern design tokens.
- **[ADR-0004](./docs/08-decisions/ADR-0004-backend-api-stack.md)**: Node.js Fastify API Service for Phase 00.
- **[ADR-0005](./docs/08-decisions/ADR-0005-database-and-caching.md)**: PostgreSQL 16 with pgvector & Redis 7.
- **[ADR-0006](./docs/08-decisions/ADR-0006-3d-browser-runtime.md)**: Three.js & React Three Fiber with WebGPU / WebGL fallback.
- **[ADR-0007](./docs/08-decisions/ADR-0007-unified-world-state-platform.md)**: Shared domain state engine across viewports.
- **[ADR-0008](./docs/08-decisions/ADR-0008-go-realtime-gateway-criteria.md)**: Performance triggers for introducing Go Realtime Gateway.
- **[ADR-0009](./docs/08-decisions/ADR-0009-rust-simulation-engine-criteria.md)**: Introduction criteria for Rust simulation core.
- **[ADR-0010](./docs/08-decisions/ADR-0010-ai-gateway-provider-abstraction.md)**: Centralized AI gateway with tool boundary enforcement.
- **[ADR-0011](./docs/08-decisions/ADR-0011-cloud-infrastructure-ecs-before-eks.md)**: AWS ECS Fargate before Kubernetes.
- **[ADR-0012](./docs/08-decisions/ADR-0012-opentelemetry-observability.md)**: OpenTelemetry vendor-neutral observability standard.

---

## Phased Roadmap

| Phase | Name | Target Capabilities | Status |
|---|---|---|---|
| **Phase 00** | **Foundation** | Monorepo, docs, ADRs, contracts, platform API, 2D web console, CI | **Complete** |
| **Phase 01** | **Platform Core** | Multi-tenant orgs, campus layout, floorplan permissions, 2D shell | Up Next |
| **Phase 02** | **First 3D World** | Central Plaza 3D, avatar controller, workstation zoom, R3F runtime | Planned |
| **Phase 03** | **Multiplayer** | Go Realtime Gateway, WebSockets, movement sync, proximity chat | Planned |
| **Phase 04** | **Social** | Guilds, persistent channels, WebRTC screen sharing, team standup rooms | Planned |
| **Phase 05** | **Gamification** | Verified XP engine, cryptographic skill badges, district leaderboards | Planned |
| **Phase 06** | **Work & Simulation** | Interactive workstations, incident ranges, cloud labs, Rust sim core | Planned |
| **Phase 07** | **AI World** | AI Gateway, Aria Receptionist, Autonomous Mentors, Interviewer NPC | Planned |
| **Phase 08** | **Digital Twin** | MQTT building telemetry, energy/occupancy twins, 3D live sensors | Planned |
| **Phase 09** | **XR & CV** | WebXR VR/AR, hand tracking, spatial window management | Planned |
| **Phase 10** | **Planetary Scale** | Spatial partitioning, multi-region distributed sync, Kubernetes (EKS) | Planned |

---

## AI Agent Constitution

If you are an AI coding assistant operating in this repository, you **must** strictly abide by **[AGENTS.md](./AGENTS.md)** and consult **[`.ai/`](./.ai/)** before suggesting or modifying code.

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
