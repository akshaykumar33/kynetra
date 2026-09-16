# Security Architecture

Secure-by-default design:
- Zero Trust network architecture.
- JWT with short-lived tokens and secure HTTP-only cookies.
- Role-Based Access Control (RBAC) enforced at the domain boundary.
- Strict Content Security Policy (CSP) and input sanitation with Zod schemas.
