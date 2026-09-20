# ADR-0004: Node.js Fastify API Service for Phase 0

Status: Accepted  
Date: 2026-09-16  
Owners: Backend Team

## Context

The core platform requires a high-performance, low-overhead HTTP API framework with first-class TypeScript support and JSON schema validation.

## Decision

Use **Fastify** on Node.js for `services/api` in Phase 0.

## Consequences

- Up to 2-3x throughput compared to traditional Express.
- Native JSON schema validation matching shared Zod contracts.
