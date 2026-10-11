'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { PCFSoftShadowMap } from 'three';
import type { WorldDistrict } from '@kynetra/contracts';
import { cameraShot, districtCenter, roadSegments, towerLevels } from '../geometry';
import type { ResolvedSelection } from '../selection';
import type { CameraCommand } from '../store';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useScenePalette, type ScenePalette } from '../hooks/useScenePalette';
import { CityEnvironment, PostEffects, SkyDome, moodSettings, type Quality } from './Atmosphere';
import { DistrictMassing } from './DistrictMassing';
import { NodeMarkers } from './NodeMarkers';
import { Roads, Traffic, Trees } from './Streetscape';
import { Tower } from './Tower';

export interface CitySceneProps {
  districts: WorldDistrict[];
  selection: ResolvedSelection;
  /** False while another lens is on screen: rendering stops entirely. */
  active: boolean;
  cameraCommand: CameraCommand | null;
  onSelectDistrict: (districtId: string) => void;
  onSelectFloor: (floorNumber: number) => void;
  onSelectNode: (nodeId: string) => void;
}

/**
 * The 3D lens over the shared world state.
 *
 * Budget (docs/01-product/3d-experience.md): under 50 draw calls — one
 * instanced mesh per district, two per tower level, two each for trees and
 * traffic. Quality drops automatically (no AO/bloom, lower resolution) when
 * the frame rate can't hold, and nothing renders while the lens is hidden.
 */
export default function CityScene(props: CitySceneProps) {
  const palette = useScenePalette();
  const reducedMotion = useReducedMotion();
  const [quality, setQuality] = useState<Quality>('high');
  if (!palette) return null;

  return (
    <Canvas
      frameloop={!props.active ? 'never' : reducedMotion ? 'demand' : 'always'}
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1]}
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ position: [70, 58, 84], fov: 36, near: 0.5, far: 700 }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
    >
      <PerformanceMonitor onDecline={() => setQuality('low')} flipflops={1} />
      <SceneContents {...props} palette={palette} reducedMotion={reducedMotion} quality={quality} />
    </Canvas>
  );
}

function SceneContents({
  districts,
  selection,
  cameraCommand,
  palette,
  reducedMotion,
  quality,
  onSelectDistrict,
  onSelectFloor,
  onSelectNode,
}: CitySceneProps & { palette: ScenePalette; reducedMotion: boolean; quality: Quality }) {
  const mood = useMemo(() => moodSettings(palette), [palette]);
  const roads = useMemo(() => roadSegments(districts), [districts]);
  const programmed = useMemo(
    () => districts.filter((d) => d.floors && d.floors.length > 0),
    [districts],
  );

  return (
    <>
      <fog attach="fog" args={[palette.horizon, 60, 190]} />
      <SkyDome palette={palette} mood={mood} />
      <CityEnvironment palette={palette} mood={mood} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, mood.hemiIntensity]} />
      <directionalLight
        position={mood.sunPosition}
        intensity={mood.sunIntensity}
        color={palette.sun}
        castShadow
        shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-far={120}
      />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[260, 64]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>

      <Roads roads={roads} palette={palette} />
      <Trees roads={roads} palette={palette} />
      {!reducedMotion && <Traffic roads={roads} palette={palette} />}

      {districts.map((district) => (
        <DistrictMassing
          key={district.id}
          district={district}
          isSelected={district.id === selection.district?.id}
          palette={palette}
          litRatio={mood.litRatio}
          onSelect={onSelectDistrict}
        />
      ))}

      {programmed.map((district) => {
        const isCurrent = district.id === selection.district?.id;
        const selectedFloor = isCurrent ? (selection.floor?.floorNumber ?? null) : null;
        return (
          <Tower
            key={district.id}
            center={districtCenter(district)}
            levels={towerLevels(district.floors ?? [])}
            selectedFloor={selectedFloor}
            palette={palette}
            litRatio={mood.litRatio}
            reducedMotion={reducedMotion}
            onSelectFloor={(floorNumber) => {
              if (!isCurrent) onSelectDistrict(district.id);
              onSelectFloor(floorNumber);
            }}
          />
        );
      })}

      {selection.district && selection.floor && (
        <NodeMarkers
          center={districtCenter(selection.district)}
          floor={selection.floor}
          selectedNodeId={selection.node?.id ?? null}
          palette={palette}
          reducedMotion={reducedMotion}
          onSelectNode={onSelectNode}
        />
      )}

      <CameraDirector selection={selection} command={cameraCommand} reducedMotion={reducedMotion} />
      <PostEffects mood={mood} quality={quality} />
    </>
  );
}

const ORBIT_STEP = Math.PI / 8;

function CameraDirector({
  selection,
  command,
  reducedMotion,
}: {
  selection: ResolvedSelection;
  command: CameraCommand | null;
  reducedMotion: boolean;
}) {
  const controls = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);
  const shot = cameraShot(selection);
  // Primitive deps: a background refetch that returns equal data must never
  // re-run the move and yank the camera away from where the user orbited it.
  const [px, py, pz] = shot.position;
  const [tx, ty, tz] = shot.target;
  const animate = !reducedMotion;

  useEffect(() => {
    void controls.current?.setLookAt(px, py, pz, tx, ty, tz, animate);
    invalidate();
  }, [px, py, pz, tx, ty, tz, animate, invalidate]);

  const seq = command?.seq;
  const type = command?.type;
  useEffect(() => {
    const c = controls.current;
    if (!c || seq === undefined) return;
    if (type === 'reset') void c.setLookAt(px, py, pz, tx, ty, tz, animate);
    if (type === 'zoom-in') void c.dolly(c.distance * 0.25, animate);
    if (type === 'zoom-out') void c.dolly(-c.distance * 0.33, animate);
    if (type === 'orbit-left') void c.rotate(-ORBIT_STEP, 0, animate);
    if (type === 'orbit-right') void c.rotate(ORBIT_STEP, 0, animate);
    invalidate();
    // Runs once per command; the shot values are read, not reacted to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={3}
      maxDistance={130}
      maxPolarAngle={Math.PI / 2 - 0.1}
      smoothTime={reducedMotion ? 0 : 0.6}
      dollySpeed={0.6}
    />
  );
}
