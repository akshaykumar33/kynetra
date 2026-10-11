'use client';

import { useMemo } from 'react';
import { BackSide, Color } from 'three';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import type { ScenePalette } from '../hooks/useScenePalette';

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uSunGlow;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));
    float sun = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    sky += uSun * pow(sun, 24.0) * uSunGlow;
    sky += uSun * pow(sun, 3.0) * 0.12 * uSunGlow * (1.0 - h);
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface Mood {
  sunPosition: [number, number, number];
  sunIntensity: number;
  hemiIntensity: number;
  envIntensity: number;
  litRatio: number;
  bloom: number;
}

/** Lighting per mood. Dusk: low warm sun, lit interiors. Day: high sun, windows dark. */
export function moodSettings(palette: ScenePalette): Mood {
  return palette.mood === 'dusk'
    ? {
        sunPosition: [-30, 9, -22],
        sunIntensity: 1.3,
        hemiIntensity: 0.35,
        envIntensity: 0.45,
        litRatio: 0.42,
        bloom: 0.9,
      }
    : {
        sunPosition: [24, 38, 16],
        sunIntensity: 2.4,
        hemiIntensity: 0.9,
        envIntensity: 0.9,
        litRatio: 0,
        bloom: 0.15,
      };
}

export function SkyDome({ palette, mood }: { palette: ScenePalette; mood: Mood }) {
  // Rebuilt only when the theme changes; the shader program itself is reused.
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new Color(palette.zenith) },
      uHorizon: { value: new Color(palette.horizon) },
      uSun: { value: new Color(palette.sun) },
      uSunDir: { value: mood.sunPosition },
      uSunGlow: { value: palette.mood === 'dusk' ? 0.9 : 0.35 },
    }),
    [palette, mood.sunPosition],
  );

  return (
    <mesh scale={300} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
      />
    </mesh>
  );
}

/**
 * Reflections for glass and metal from a locally rendered environment —
 * soft sky, a warm key and a ground bounce. No HDR download at runtime.
 */
export function CityEnvironment({ palette, mood }: { palette: ScenePalette; mood: Mood }) {
  return (
    <Environment resolution={128} environmentIntensity={mood.envIntensity}>
      <color attach="background" args={[palette.horizon]} />
      <Lightformer
        form="rect"
        intensity={1.2}
        color={palette.zenith}
        scale={[40, 40, 1]}
        position={[0, 20, 0]}
        rotation-x={Math.PI / 2}
      />
      <Lightformer
        form="rect"
        intensity={2.5}
        color={palette.sun}
        scale={[20, 6, 1]}
        position={[mood.sunPosition[0], 6, mood.sunPosition[2]]}
      />
      <Lightformer
        form="rect"
        intensity={0.8}
        color={palette.hemiSky}
        scale={[30, 4, 1]}
        position={[20, 3, 20]}
        rotation-y={Math.PI}
      />
      <Lightformer
        form="rect"
        intensity={0.4}
        color={palette.hemiGround}
        scale={[40, 40, 1]}
        position={[0, -10, 0]}
        rotation-x={-Math.PI / 2}
      />
    </Environment>
  );
}

export type Quality = 'high' | 'low';

/**
 * Ambient occlusion grounds buildings, bloom makes lit windows and traffic
 * glow at dusk. On weaker GPUs (quality "low") only anti-aliasing remains.
 */
export function PostEffects({ mood, quality }: { mood: Mood; quality: Quality }) {
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <SMAA />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={1.6} intensity={2.2} distanceFalloff={1} halfRes />
      <Bloom intensity={mood.bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.3} darkness={0.45} />
    </EffectComposer>
  );
}
