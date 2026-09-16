# Architecture Reference for AI Agents

- **Monolith First**: Modular monolith architecture with strict boundaries.
- **Contract Driven**: `packages/contracts` is the source of truth for domain data structures.
- **Presentation Decoupling**: The World Platform is independent of whether a user is viewing in 2D or 3D.
