# ADR-0008: Introduction Criteria for Go Realtime Gateway

Status: Accepted  
Date: 2026-09-16  
Owners: Realtime Team  

## Context
Real-time multiplayer movement and presence require lightweight, high-concurrency connection handling.

## Decision
Defer the standalone Go Realtime Gateway until **Phase 03 (Multiplayer)** when concurrent WebSocket connections exceed 1,000 active sessions or tick rates require it.

## Consequences
- Avoids premature polyglot complexity during Phase 00 and 01.
