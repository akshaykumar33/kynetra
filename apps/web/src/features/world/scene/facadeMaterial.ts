import { Color, MeshStandardMaterial, type MeshStandardMaterialParameters } from 'three';

export interface FacadeOptions extends MeshStandardMaterialParameters {
  /** Width of one window bay, world units. */
  bayWidth: number;
  /** Storey height, world units. */
  storeyHeight: number;
  /** Fraction of windows with lights on (0–1). */
  litRatio: number;
  /** Interior light colour; black switches every window off. */
  windowGlow: string;
  /** Glass tint for the window panes. */
  glass: string;
  /** Emissive strength of lit windows. Above 1 feeds the bloom pass. */
  glowIntensity?: number;
  /** False draws vertical mullions only (curtain walls cut into separate slabs). */
  rows?: boolean;
  /** Height below which walls are solid (ground-floor lobbies, plinths). */
  plinth?: number;
}

export type FacadeMaterial = MeshStandardMaterial & {
  userData: { uniforms: Record<string, { value: unknown }> };
};

/**
 * A MeshStandardMaterial whose walls grow a window grid in world space.
 * Windows are computed per pixel from world position, so instanced blocks of
 * any scale keep square, evenly spaced windows without textures or UV work —
 * the whole district stays a single draw call.
 */
export function createFacadeMaterial({
  bayWidth,
  storeyHeight,
  litRatio,
  windowGlow,
  glass,
  glowIntensity = 1.6,
  plinth = 0.25,
  rows = true,
  ...params
}: FacadeOptions): FacadeMaterial {
  const material = new MeshStandardMaterial(params) as FacadeMaterial;
  const uniforms = {
    uBay: { value: bayWidth },
    uStorey: { value: storeyHeight },
    uLit: { value: litRatio },
    uGlow: { value: new Color(windowGlow).multiplyScalar(glowIntensity) },
    uGlass: { value: new Color(glass) },
    uPlinth: { value: plinth },
    uRows: { value: rows ? 1 : 0 },
  };
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vFacadePos;\nvarying vec3 vFacadeNormal;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 facadeWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          facadeWorld = instanceMatrix * facadeWorld;
        #endif
        facadeWorld = modelMatrix * facadeWorld;
        vFacadePos = facadeWorld.xyz;
        vFacadeNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vFacadePos;
        varying vec3 vFacadeNormal;
        uniform float uBay;
        uniform float uStorey;
        uniform float uLit;
        uniform vec3 uGlow;
        uniform vec3 uGlass;
        uniform float uPlinth;
        uniform float uRows;
        float facadeHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float facadeWall = 1.0 - step(0.5, abs(vFacadeNormal.y));
        float facadeAlong = abs(vFacadeNormal.x) > 0.5 ? vFacadePos.z : vFacadePos.x;
        vec2 facadeCell = vec2(facadeAlong / uBay, (vFacadePos.y - uPlinth) / uStorey);
        vec2 facadeF = fract(facadeCell);
        float facadeWindow = facadeWall
          * step(uPlinth, vFacadePos.y)
          * step(mix(0.06, 0.16, uRows), facadeF.x) * step(facadeF.x, mix(0.94, 0.84, uRows))
          * mix(1.0, step(0.22, facadeF.y) * step(facadeF.y, 0.82), uRows);
        vec2 facadeId = floor(facadeCell) + floor(vFacadeNormal.xz * 7.0) + floor(vFacadePos.xz / 3.0) * 17.0;
        float facadeRand = facadeHash(facadeId);
        diffuseColor.rgb = mix(diffuseColor.rgb, uGlass, facadeWindow * 0.9);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, facadeWindow);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float facadeOn = step(1.0 - uLit, facadeRand);
        totalEmissiveRadiance += uGlow * facadeWindow * facadeOn * (0.55 + 0.45 * facadeHash(facadeId + 3.1));`,
      );
  };

  return material;
}

/** Updates colours in place so a theme change never recompiles the shader. */
export function updateFacade(
  material: FacadeMaterial,
  next: { windowGlow: string; glass: string; litRatio: number; glowIntensity?: number },
) {
  const u = material.userData.uniforms;
  (u.uGlow!.value as Color).set(next.windowGlow).multiplyScalar(next.glowIntensity ?? 1.6);
  (u.uGlass!.value as Color).set(next.glass);
  u.uLit!.value = next.litRatio;
}
