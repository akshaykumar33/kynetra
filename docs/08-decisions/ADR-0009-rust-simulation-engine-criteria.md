# ADR-0009: Introduction Criteria for Rust Simulation Core

Status: Accepted  
Date: 2026-09-16  
Owners: Simulation Team

## Context

Complex spatial indexing, physics, and determinism may eventually demand native systems languages.

## Decision

Introduce the Rust simulation engine in **Phase 06 (Work & Simulation)** when spatial entity counts or physics calculations exceed Node.js throughput limits.

## Consequences

- Keeps Phase 00–02 lightweight while preserving an explicit architectural migration target.
