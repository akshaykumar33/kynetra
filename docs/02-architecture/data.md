# Data Architecture

- Primary transactional storage: PostgreSQL 16.
- Vector search: `pgvector` extension inside Postgres.
- In-memory caching: Redis 7.
- Migrations: Explicit, reversible SQL migration scripts. No auto-sync in production.
