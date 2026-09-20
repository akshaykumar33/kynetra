# ADR-0006: Three.js & React Three Fiber Runtime

Status: Accepted  
Date: 2026-09-16  
Owners: 3D Graphics Team

## Context

The 3D world must run frictionlessly in standard web browsers without requiring desktop binary installations.

## Decision

Adopt **Three.js** via **React Three Fiber (R3F)** with WebGPU support and WebGL fallback.

## Consequences

- Direct integration into the React component tree and state management.
- Broad device compatibility across laptops, phones, and headsets.
