# Security Policy

## Reporting a Vulnerability
We take the security of Kynetra seriously. If you discover a vulnerability, please do NOT create a public GitHub issue.

Instead, please send a report to **security@kynetra.dev** or contact the repository owner privately.

## Security Architecture
- All network inputs are validated with strict Zod schemas at runtime boundaries.
- Session tokens are stored in secure, HTTP-only, SameSite=Strict cookies.
- No secrets or private keys are ever committed to version control.
- See `docs/07-security/` for our full threat model and security specifications.
