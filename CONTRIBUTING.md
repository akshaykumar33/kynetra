# Contributing to Kynetra

Thank you for your interest in contributing to Kynetra! We are building an Open Digital IT World engineered to last for years.

## Code of Conduct
Please review and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Git & Branching Strategy
We use **trunk-based development**:
- Main branch: `main`
- Feature branches: `feat/<short-name>`
- Bug fixes: `fix/<short-name>`
- Documentation: `docs/<short-name>`
- Refactoring: `refactor/<short-name>`

## Commit Convention
We strictly enforce **Conventional Commits**:
```
feat(world): add central plaza scene loader
fix(api): prevent duplicate district registration
docs(architecture): document world-state boundaries
test(contracts): add test cases for floor occupancy
```

## Pull Request Workflow
1. Branch from `main`.
2. Ensure domain models in `packages/contracts` are updated first if schemas change.
3. Write automated unit tests for your changes.
4. Verify locally:
   ```bash
   pnpm run typecheck
   pnpm run test
   pnpm run build
   ```
5. Open a Pull Request using the provided template in `.github/PULL_REQUEST_TEMPLATE.md`.
