# ADR-0005: PostgreSQL 16 with pgvector & Redis 7

Status: Accepted  
Date: 2026-09-16  
Owners: Data Team  

## Context
We need reliable ACID storage for user identity, world layout, and simulation states, plus vector search for AI RAG and fast ephemeral caching.

## Decision
Use **PostgreSQL 16** with the **pgvector** extension as the primary database, paired with **Redis 7** for session caching and pub/sub.

## Consequences
- Eliminates the operational burden of a separate vector database in early phases.
- Proven reliability and high transactional throughput.
