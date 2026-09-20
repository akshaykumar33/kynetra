# C4 Model: Container Architecture

Details the executable containers across the system:

1. `apps/web`: Frontend console and 3D canvas.
2. `services/api`: REST/JSON core platform API.
3. `services/realtime`: WebSocket presence and state broadcaster (Phase 3).
4. `services/ai`: AI agent orchestration and context engine.
5. `postgres`: Relational data, user profiles, world entities, vector embeddings.
6. `redis`: Session cache, rate limiting, and ephemeral pub/sub.
