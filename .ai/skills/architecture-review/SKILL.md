---
name: architecture-review
description: Guidelines for reviewing architectural changes against Kynetra engineering principles.
---
# Architecture Review Skill
When evaluating changes:
- Verify modularity: are domain boundaries respected?
- Verify contracts: are types defined in `packages/contracts`?
- Check scalability: are there hidden unbounded queries or state locks?
