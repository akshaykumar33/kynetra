# ADR-0012: OpenTelemetry as Unified Telemetry Standard

Status: Accepted  
Date: 2026-09-16  
Owners: SRE Team  

## Context
Vendor-specific monitoring agents create lock-in and inconsistent telemetry across heterogeneous language runtimes.

## Decision
Standardize on **OpenTelemetry** for traces, metrics, and logs across all services.

## Consequences
- Unified trace context propagation across HTTP, WebSockets, and background workers.
