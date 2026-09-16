# ADR-0003: Next.js App Router & Modern Design Tokens

Status: Accepted  
Date: 2026-09-16  
Owners: Frontend Team  

## Context
Kynetra requires a 2D control surface that is lightning fast, SEO-friendly for public spaces, and capable of hosting embedded WebGL/WebGPU canvases.

## Decision
Adopt **Next.js 15** with App Router, TypeScript, and a custom design token system inspired by modern developer consoles.

## Consequences
- High-performance server rendering for initial load.
- Seamless hydration of client-side interactive 3D viewports.
