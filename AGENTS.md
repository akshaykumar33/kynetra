# AGENTS.md — Canonical AI Engineering Constitution

Welcome, AI Coding Agent. You are operating inside the **Kynetra** codebase.

This repository serves as **persistent engineering memory**. Never rely solely on chat conversation history; always consult and update repository files.

## 1. Absolute Golden Rules

1. **Inspect Before Acting**:
   - Inspect architecture documentation (`docs/02-architecture/`) and relevant ADRs (`docs/08-decisions/`) before writing code.
   - Read `docs/09-phases/phase-00-foundation.md` to understand the boundaries of the current phase.
2. **Never Invent Architecture**:
   - Do NOT introduce unapproved databases, frameworks, or microservices without an ADR.
   - Do NOT bypass the shared contracts in `packages/contracts`.
3. **No Dead or Speculative Code**:
   - Every file, interface, and test must have a direct purpose. No empty placeholder directories.
4. **Strong Typing & Zero `any`**:
   - Enforce strict TypeScript types. Use discriminating unions and Zod schema validation for runtime boundaries.
5. **Continuous Verification**:
   - Run linter (`pnpm run lint`), typechecker (`pnpm run typecheck`), and unit tests (`pnpm run test`) before declaring any task complete.
6. **Documentation Integrity**:
   - If you introduce a feature or modify behavior, update the relevant markdown files in `docs/` and record significant changes in `CHANGELOG.md`.

## 2. Project Layout
- `apps/web`: 2D management shell, district visualizer, Innovation Tower HUD, and 3D viewport canvas.
- `services/api`: Fastify platform service exposing health, world state, and telemetry.
- `packages/contracts`: Canonical TypeScript interfaces, DTOs, and Zod schemas.
- `packages/config`: Shared TypeScript and ESLint configuration.
- `docs/`: Architecture, design, product, engineering, and phase specifications.
- `.ai/`: Workflows, context definitions, and project-specific skills.

## 3. Mandatory AI Feature Workflow
1. Identify relevant contracts in `packages/contracts`. If models change, update contracts first.
2. Implement service or UI layer with pure functions where feasible.
3. Write automated tests (`*.spec.ts` or `*.test.ts`).
4. Validate with `pnpm run test` and `pnpm run typecheck`.
5. Summarize changes in conventional commit format.
