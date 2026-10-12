# Phase 11: Production readiness and beta

**Branch:** `chore/production-readiness`
**Depends on:** Phases 01–05 (critical path). Other phases are optional for beta.

## Goal

A real company can use it every day, safely and reliably.

## In scope

1. **Security review:**
   - Threat model (auth, websockets, LiveKit tokens, uploads, cross-tenant access).
   - Dependency audit, CSP and security headers, and rate limits.
   - Secret management, and an external pen-test checklist.
2. **Privacy and compliance:** GDPR data export and account deletion, a retention policy for chat and
   presence logs, a DPA template, and a written statement of what is never tracked.
3. **Infrastructure:**
   - Infrastructure as code for web, API, realtime, Postgres, Redis and LiveKit.
   - Staging and production environments.
   - Zero-downtime deploys (drain realtime rooms), plus backups with a tested restore.
4. **Observability:**
   - OpenTelemetry traces and metrics.
   - SLOs: join floor 3 s or less (p95); presence update latency 300 ms or less (p95); voice
     connect 2 s or less.
   - Alerts and runbooks in `docs/runbooks/`.
5. **Load test:** 20 floors × 60 users with bots for 1 hour.
6. **Release process:** semver, changelog, feature flags, and a rollback plan.
7. **Beta:** onboard 2–3 pilot companies, add an in-app feedback button, and set up a status page.

## Exit gate

- Staging passes the 1-hour load test inside the SLOs (dashboards linked).
- A restore from backup into a fresh database is verified.
- The security checklist has no open high or critical items.
- First beta company active for 5 working days with no Sev-1 incident.

## Prompt

```
Execute Phase 11 from docs/roadmap/phases/11-production-and-beta.md, following
docs/roadmap/PROMPT_RULES.md. Load the devops-sre, security-engineer,
release-manager and technical-writer skills. Produce the threat model and
fix findings, GDPR export/delete and retention, infrastructure as code for
staging and production, OpenTelemetry with the stated SLOs, alerts and
runbooks, a 20x60 load test, a backup-restore drill, and the release
process. Report each gate item with evidence. Ask before any deploy to
production. Do not merge.
```
