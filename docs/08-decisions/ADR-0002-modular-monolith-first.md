# ADR-0002: Modular Monolith Before Microservices

Status: Accepted  
Date: 2026-09-16  
Owners: Architecture Team

## Context

Premature microservices introduce network latency, distributed transaction complexity, and massive DevOps friction before domain boundaries are established.

## Decision

Structure the core backend as a **modular monolith** with clear in-process domain boundaries (modules, interfaces, DTOs). Extract dedicated services (e.g. Go realtime) only when performance boundaries require it.

## Consequences

- Fast developer velocity and straightforward local debugging.
- Clean code boundaries allow clean extraction to standalone microservices later.
