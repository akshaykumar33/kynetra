# Knovra Office

A virtual office where remote and hybrid teams share one floor. People see who is in,
walk over to talk, knock on meeting rooms and meet in the lounge, so working from home
feels like being in the office.

## Stack
Vite + React 18 + TypeScript, 3D with React Three Fiber and drei, state with zustand.

## Layout
- `src/world/layout.ts`: floor plan data (zones, desks, people, obstacles). Change the office here.
- `src/world/Floor.tsx`: static 3D environment built from the layout.
- `src/world/People.tsx`: player movement, collisions, proximity and colleague routines.
- `src/world/Avatar.tsx`: stylised avatar built from primitives.
- `src/hud/Hud.tsx`: 2D overlay (people list, conversation bar, knock, status).
- `src/state.ts`: zustand store plus per-frame positions kept outside React.

## Rules
- Keep per-frame data (positions) out of React state; write to the store only when a value changes.
- Voice, presence and colleagues are simulated in the prototype; real-time (WebSocket rooms,
  LiveKit voice) comes in phase 2.
- `npm run build` must pass (it runs `tsc` first).

## CodeGraph
If `.codegraph/` exists, use `codegraph_explore` before grep or reading whole files.
