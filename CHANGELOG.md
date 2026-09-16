# Changelog

All notable changes to the Kynetra platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-16
### Added
- **Phase 00 Foundation**: Established complete monorepo architecture with pnpm workspaces and Turborepo.
- **Documentation Architecture**: Implemented 103 comprehensive technical documents and 12 foundational Architecture Decision Records (ADRs).
- **Engineering Governance**: Created canonical `AGENTS.md`, `.ai/` workflows, specialized AI agent skills, and GitHub issue/PR templates.
- **Domain Contracts**: Scaffolded `@kynetra/contracts` with strongly typed Zod schemas for WorldDistricts, InnovationTower, Telemetry, and UserProfiles.
- **Platform Core API**: Implemented `@kynetra/api` with Fastify, exposing `/health/live`, `/health/ready`, `/api/v1/world/districts`, and `/api/v1/telemetry/stats`.
- **2D World Console**: Implemented `@kynetra/web` using Next.js 15 App Router featuring dark slate aesthetic, Kynetra Central district visualizer, Innovation Tower floor deck, interactive node inspector, and system diagnostics HUD.
- **DevOps & Infrastructure**: Configured `docker-compose.yml` for PostgreSQL 16 (pgvector), Redis 7, and Jaeger/OTel, plus GitHub Actions CI workflow.
