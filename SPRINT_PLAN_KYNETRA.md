# Kynetra 15-Day Sprint Plan (Weekdays Only)

### Sprint Metadata

| Field | Details |
|---|---|
| **Lead Engineer** | Dinesh Kumar (`din-esh-kumar` / `dkdinesh70707@gmail.com`) |
| **Project Name** | Kynetra ([`akshaykumar33/kynetra`](./)) |
| **Duration** | 15 Working Days (Weekdays Only) |
| **Sprint Window** | Wednesday, September 16, 2026 – Tuesday, October 06, 2026 |
| **Deadline** | Tuesday, October 06, 2026 |

---

### 15-Day Weekday Execution Schedule

| Day | Date | Module | Focus Area | Detailed Tasks to Complete | Deliverable / Verification |
|---|---|---|---|---|---|
| **Day 01** | Wed, Sep 16, 2026 | **Contracts** | Zod Schemas & ORM Setup | • Create `organization.ts`, `auth.ts`, `building.ts` in `packages/contracts`<br>• Install `drizzle-orm`, `pg`, `ioredis` in `services/api`<br>• Define relational schema in `services/api/src/db/schema.ts` | `pnpm --filter @kynetra/contracts typecheck` passes with 0 errors |
| **Day 02** | Thu, Sep 17, 2026 | **Database** | Migrations & Seeder | • Configure Drizzle connection pool with PostgreSQL 16<br>• Generate SQL migrations (`drizzle-kit generate`)<br>• Write `seed.ts` to populate the 4 districts and Innovation Tower floors | Postgres container contains populated districts and floor records |
| **Day 03** | Fri, Sep 18, 2026 | **API Auth** | JWT Auth & RBAC | • Install `@fastify/jwt` and `@fastify/cookie`<br>• Implement `/register`, `/login`, `/me`, `/logout` endpoints<br>• Create RBAC pre-handler hook (`developer`, `mentor`, `sre_engineer`, `admin`) | Auth unit test suite passes in Vitest with valid JWT issuance |
| **Day 04** | Mon, Sep 21, 2026 | **Caching** | Redis 7 Integration | • Connect Redis client (`ioredis`) with connection retry logic<br>• Implement cache-aside for `/api/v1/world/districts`<br>• Update `/health/ready` to check both PostgreSQL and Redis | `/health/ready` returns `{ status: "ok", postgres: "up", redis: "up" }` |
| **Day 05** | Tue, Sep 22, 2026 | **Frontend UI** | Next.js 15 App Router | • Restructure `apps/web` into routes: `/`, `/districts/[id]`, `/floors/[id]`<br>• Setup TanStack React Query provider and custom hooks<br>• Remove static hardcoded `DISTRICTS_DATA` array | Web UI dynamically renders real database data from Fastify API |
| **Day 06** | Wed, Sep 23, 2026 | **3D Graphics** | R3F Viewport & Central Plaza | • Install `@react-three/fiber`, `@react-three/drei`, `three`<br>• Create `WorldCanvas.tsx` with WebGPU/WebGL fallback<br>• Build procedural 3D Central Plaza terrain and 2D/3D toggle button | 3D canvas renders Central Plaza at 60 FPS in browser |
| **Day 07** | Thu, Sep 24, 2026 | **3D Graphics** | Innovation Tower Interior | • Build 3D interior floor scene with architectural walls and lighting<br>• Place 3D workstation meshes at contract coordinates `(x, y, z)`<br>• Add pointer hover highlights and billboard name tags | Interactive workstation meshes highlight on pointer hover |
| **Day 08** | Fri, Sep 25, 2026 | **3D Controls** | Avatar & Camera Docking | • Implement 3rd-person avatar controller (WASD + mouse look)<br>• Add mesh collision boundaries<br>• Implement smooth camera docking lerp when clicking workstations | Avatar moves through scene; clicking workstation zooms camera into screen |
| **Day 09** | Mon, Sep 28, 2026 | **Terminal UI** | In-Browser Xterm.js | • Install `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`<br>• Create `XtermTerminal.tsx` matching Kynetra dark theme<br>• Build floating workstation modal with Terminal and Architecture tabs | Terminal renders with ANSI colors, monospace font, and auto-resize |
| **Day 10** | Tue, Sep 29, 2026 | **Backend WS** | WebSocket PTY Runner | • Install `@fastify/websocket` and `node-pty` in `services/api`<br>• Implement `WS /api/v1/workstations/:id/pty` route with JWT check<br>• Connect Xterm.js frontend to real shell process | Typing commands in browser terminal executes live commands in backend |
| **Day 11** | Wed, Sep 30, 2026 | **AI Gateway** | Provider Adapter & SSE | • Build AI Gateway module with Gemini/Claude/mock adapter (ADR-0010)<br>• Implement Aria Receptionist prompt template<br>• Expose streaming endpoint via Server-Sent Events (SSE) | Endpoint returns real-time streamed text chunks from LLM adapter |
| **Day 12** | Thu, Oct 01, 2026 | **AI Concierge** | Aria UI & RAG (`pgvector`) | • Enable `pgvector` in PostgreSQL and create embeddings table<br>• Chunk and index technical markdown docs in `docs/`<br>• Build floating Aria Concierge dialogue modal with quick-prompts | Aria answers questions about Kynetra architecture using RAG context |
| **Day 13** | Fri, Oct 02, 2026 | **Simulation** | SRE Outage State Machine | • Implement incident simulation engine ("DB Pool Starvation")<br>• Create `/simulations/start` and `/simulations/submit-patch` endpoints<br>• Build live telemetry anomaly error charts on Floor 8 Cloud Lab | Triggering incident spikes error rates; valid patch resolves outage |
| **Day 14** | Mon, Oct 05, 2026 | **Testing & OTel** | Playwright E2E & Tracing | • Install Playwright; write E2E tests for auth, navigation, and terminal<br>• Install `@opentelemetry/sdk-node` in `services/api`<br>• Configure OTLP exporter to send traces to Jaeger (`localhost:16686`) | Playwright E2E test suite passes; traces appear in Jaeger UI |
| **Day 15** | Tue, Oct 06, 2026 | **Sign-Off** | Full CI Verification & Audit | • Run `pnpm run lint`, `typecheck`, `test`, `build`<br>• Update `docs/09-phases/phase-01-platform-core.md` and `CHANGELOG.md`<br>• Final sprint milestone delivery | Monorepo CI passes cleanly with zero errors; milestone complete |

---

### Verification Quality Gates (Day 15 DoD)

| Check | Command | Target Outcome |
|---|---|---|
| **Lint** | `pnpm run lint` | 0 errors, 0 warnings |
| **Typecheck** | `pnpm run typecheck` | Strict compiler passes across all packages |
| **Unit & Integration Tests** | `pnpm run test` | All Vitest suites pass |
| **End-to-End Tests** | `pnpm exec playwright test` | All browser interaction tests pass |
| **Production Build** | `pnpm run build` | Next.js and Fastify bundles build successfully |
| **Service Health** | `curl http://localhost:4000/health/ready` | Returns `{"status":"ok","postgres":"up","redis":"up"}` |
