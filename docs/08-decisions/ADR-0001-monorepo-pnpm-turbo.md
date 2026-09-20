# ADR-0001: Polyglot Monorepo with pnpm & Turborepo

Status: Accepted  
Date: 2026-09-16  
Owners: Architecture Team

## Context

Kynetra involves web clients, backend APIs, shared contract schemas, and future realtime/simulation micro-engines. Managing multiple separate repositories creates severe schema drift and coordination overhead.

## Decision

Adopt a monorepo architecture using **pnpm workspaces** and **Turborepo** for build caching and task orchestration.

## Consequences

- Single repository containing contracts, apps, services, and infrastructure.
- Zero schema duplication; TypeScript types shared directly between backend and frontend.
