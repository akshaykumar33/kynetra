# Development Guide

## Environment Setup
1. Clone the repository and install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Start backing services via Docker Compose:
   ```bash
   docker compose up -d
   ```

## Workspace Commands
- `pnpm run dev`: Start all services and apps in parallel development mode.
- `pnpm run test`: Run Vitest across all workspace packages.
- `pnpm run typecheck`: Run TypeScript compilation checks.
- `pnpm run build`: Build packages, API server, and Next.js web application.

## Testing Standards
- All business logic in services and shared contracts must have corresponding unit tests (`*.spec.ts`).
- Test HTTP endpoints using Fastify's in-memory `app.inject()` method.
