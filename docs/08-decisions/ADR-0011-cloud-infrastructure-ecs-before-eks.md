# ADR-0011: AWS ECS Fargate Before EKS Kubernetes

Status: Accepted  
Date: 2026-09-16  
Owners: DevOps Team

## Context

Kubernetes introduces substantial control-plane overhead, complex networking, and operational toil for early-stage platforms.

## Decision

Deploy containerized workloads to **AWS ECS Fargate** initially, migrating to EKS only when complex orchestration or multi-tenant pod isolation mandates it (Phase 10).

## Consequences

- Rapid cloud deployment with minimal infrastructure management overhead.
