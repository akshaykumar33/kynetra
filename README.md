# Knovra AI Build Kit

This folder is the execution playbook for building **Knovra**: a universal persistent project-intelligence and context layer for AI development agents.

Knovra is designed to continuously understand a software project, preserve decisions and history, index code relationships, retrieve the right context, and make that context available to Codex, Claude, Antigravity, IDE agents, CLIs, or future AI systems.

## Core product idea

Knovra is not another chatbot or IDE.

It is:

- a code intelligence engine
- a context graph
- a semantic memory system
- a decision-memory system
- an agent event/history system
- a local-first runtime
- an MCP/API/SDK interoperability layer
- a web and desktop product for inspecting project intelligence

## Recommended stack

| Layer | Technology |
|---|---|
| Product UI | Next.js + React + TypeScript |
| SaaS backend | NestJS + TypeScript |
| Local daemon / gateway / CLI | Go |
| Code intelligence / indexing | Rust + Tree-sitter |
| AI / context engine | Python + FastAPI |
| Graph database | Neo4j |
| Primary database | PostgreSQL |
| Semantic search | pgvector |
| Cache | Redis |
| Event backbone | NATS JetStream |
| Raw artifacts | S3 / MinIO |
| Desktop | Tauri |
| Agent protocol | MCP |
| Internal contracts | Protobuf / gRPC |
| Infra | Docker + Terraform + AWS |
| Observability | OpenTelemetry + Prometheus + Grafana |

## How to use this kit

1. Read `docs/PRODUCT.md`.
2. Read `docs/ARCHITECTURE.md`.
3. Read `docs/GIT_RULES.md` for branching and commit standards.
4. Give `prompts/00_MASTER_SYSTEM_PROMPT.md` to the coding agent.
5. Execute phases in order from `phases/01_FOUNDATION.md`.
6. Before every phase, run `prompts/01_REPO_AUDIT_PROMPT.md`.
7. After every phase, run `quality/PHASE_ACCEPTANCE_PROMPT.md`.
8. Do not move to the next phase until the current phase's acceptance criteria pass.
9. Use `quality/SECURITY_REVIEW_PROMPT.md` and `quality/ARCHITECTURE_REVIEW_PROMPT.md` regularly.


## Non-negotiable product rule

**AI agents do not own Knovra context. Knovra owns context and agents consume it.**

The model or IDE can change. Knovra must remain the persistent project-intelligence layer.

## Monorepo Layout (Phase 01 Foundation)

```text
apps/
  web/                  # Next.js 14+ Product UI & Graph Explorer (:3000)
  api/                  # NestJS SaaS & Workspace API (:4000)

services/
  runtime/              # Go Local Daemon & MCP Universal Gateway (:8080)
  code-indexer/         # Rust + Tree-sitter Code Intelligence Engine
  context-engine/       # Python FastAPI AI Context Engine & Planner (:8000)

packages/
  contracts/            # Shared Protobuf & TypeScript contracts
  config/               # Project configuration schema & validator
  mcp/                  # MCP tool definitions & schemas

infra/
  docker/               # Docker Compose (Postgres+pgvector, Neo4j, Redis, NATS, MinIO)
  terraform/            # Cloud provisioning skeleton

graph/                  # Neo4j Cypher schemas, constraints & indexes
docs/                   # Product & Architecture specifications
```

## Quickstart & Local Development

### 1. Start Containerized Infrastructure
```bash
# Start Postgres (pgvector), Neo4j, Redis, NATS, and MinIO
docker compose -f infra/docker/docker-compose.yml up -d

# Check status
docker compose -f infra/docker/docker-compose.yml ps
```

### 2. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

### 3. Service Health Endpoints
Every service exposes a standardized health check:
- **Next.js Web UI**: `GET http://localhost:3000/api/health`
- **NestJS SaaS API**: `GET http://localhost:4000/health`
- **Go Runtime Daemon**: `GET http://localhost:8080/healthz`
- **Python Context Engine**: `GET http://localhost:8000/health`
- **Rust Indexer CLI**: `knovra-indexer` (outputs JSON status)
- **Neo4j Browser**: `http://localhost:7474`
- **MinIO Console**: `http://localhost:9001`
- **NATS Monitoring**: `http://localhost:8222/varz`

