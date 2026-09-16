# ADR-0010: Centralized AI Gateway & Provider Abstraction

Status: Accepted  
Date: 2026-09-16  
Owners: AI Team  

## Context
Calling external LLM APIs directly from application components causes tight coupling, unmonitored costs, and security risks.

## Decision
Route all AI interactions through a centralized **AI Gateway** abstraction supporting pluggable providers, token rate limiting, and tool permission boundaries.

## Consequences
- Easy swapping of LLM providers without touching frontend or product logic.
