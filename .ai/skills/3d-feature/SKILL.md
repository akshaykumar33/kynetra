---
name: 3d-feature
description: Guide for implementing 3D scenes and interactions using Three.js & R3F.
---
# 3D Feature Skill
- Respect performance budgets: <= 50 draw calls per viewport, instanced meshes for repeated elements.
- Clean up geometries, textures, and event listeners on unmount.
- Ensure 2D fallback HUD is operable when WebGL is unavailable.
