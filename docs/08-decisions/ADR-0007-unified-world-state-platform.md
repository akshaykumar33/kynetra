# ADR-0007: Shared Domain State Across 2D, 3D, and XR

Status: Accepted  
Date: 2026-09-16  
Owners: Architecture Team  

## Context
Developing separate logic for 2D dashboards and 3D worlds causes state divergence and double development cost.

## Decision
Establish a **World State Engine** in `packages/contracts` and core platform services that exposes authoritative world objects; 2D and 3D are presentation layers.

## Consequences
- Any state change in the 2D console immediately reflects in the 3D world and vice versa.
