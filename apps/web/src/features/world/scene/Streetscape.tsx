'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type InstancedMesh } from 'three';
import { ROAD_WIDTH, treePositions, type RoadSegment } from '../geometry';
import type { ScenePalette } from '../hooks/useScenePalette';

const dummy = new Object3D();

/** Asphalt with a dashed centre line, one mesh per avenue. */
export function Roads({ roads, palette }: { roads: RoadSegment[]; palette: ScenePalette }) {
  return (
    <>
      {roads.map((road) => {
        const cx = (road.from[0] + road.to[0]) / 2;
        const cz = (road.from[1] + road.to[1]) / 2;
        const angle = -Math.atan2(road.dir[1], road.dir[0]);
        return (
          <group key={road.id} position={[cx, 0, cz]} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[road.length, ROAD_WIDTH]} />
              <meshStandardMaterial color={palette.road} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[road.length, 0.03]} />
              <meshBasicMaterial color={palette.gridMajor} transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Low-poly street trees: two instanced meshes however long the avenues get. */
export function Trees({ roads, palette }: { roads: RoadSegment[]; palette: ScenePalette }) {
  const positions = useMemo(() => treePositions(roads), [roads]);
  const crowns = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!crowns.current || !trunks.current) return;
    positions.forEach(([x, z], i) => {
      const scale = 0.85 + ((i * 7919) % 13) / 40;
      dummy.position.set(x, 0.55 * scale, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      crowns.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 0.15, z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      trunks.current!.setMatrixAt(i, dummy.matrix);
    });
    crowns.current.instanceMatrix.needsUpdate = true;
    trunks.current.instanceMatrix.needsUpdate = true;
    crowns.current.computeBoundingSphere();
    trunks.current.computeBoundingSphere();
  }, [positions]);

  return (
    <>
      <instancedMesh ref={crowns} args={[undefined, undefined, positions.length]} castShadow>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color={palette.foliage} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, positions.length]}>
        <cylinderGeometry args={[0.03, 0.04, 0.3, 5]} />
        <meshStandardMaterial color={palette.buildingActive} roughness={1} />
      </instancedMesh>
    </>
  );
}

const CARS_PER_LANE = 7;
const CAR_SPEED = 1.6;

/**
 * Traffic on the avenues: a small, constant sign that the city is live.
 * Inbound cars show tail lights, outbound show headlights — as a viewer
 * looking along a real road at dusk would see them. Two draw calls total.
 */
export function Traffic({ roads, palette }: { roads: RoadSegment[]; palette: ScenePalette }) {
  const outbound = useRef<InstancedMesh>(null);
  const inbound = useRef<InstancedMesh>(null);
  const count = roads.length * CARS_PER_LANE;
  const glow = palette.mood === 'dusk' ? 3 : 1;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    roads.forEach((road, r) => {
      const normal = [-road.dir[1], road.dir[0]] as const;
      const heading = -Math.atan2(road.dir[1], road.dir[0]);
      for (let c = 0; c < CARS_PER_LANE; c++) {
        const index = r * CARS_PER_LANE + c;
        // Stagger cars irregularly so the flow never reads as a conveyor belt.
        const offset = (c / CARS_PER_LANE + ((c * 0.618) % 0.09)) * road.length;
        for (const [mesh, direction] of [
          [outbound.current, 1],
          [inbound.current, -1],
        ] as const) {
          if (!mesh) continue;
          const travelled = (offset + time * CAR_SPEED * (0.85 + (c % 3) * 0.1)) % road.length;
          const t = direction === 1 ? travelled : road.length - travelled;
          const lane = 0.22 * direction;
          dummy.position.set(
            road.from[0] + road.dir[0] * t + normal[0] * lane,
            0.07,
            road.from[1] + road.dir[1] * t + normal[1] * lane,
          );
          dummy.rotation.set(0, heading, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        }
      }
    });
    if (outbound.current) outbound.current.instanceMatrix.needsUpdate = true;
    if (inbound.current) inbound.current.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;
  return (
    <>
      <instancedMesh ref={outbound} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[0.26, 0.09, 0.13]} />
        <meshStandardMaterial
          color={palette.headlight}
          emissive={palette.headlight}
          emissiveIntensity={glow}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={inbound} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[0.26, 0.09, 0.13]} />
        <meshStandardMaterial
          color={palette.taillight}
          emissive={palette.taillight}
          emissiveIntensity={glow}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}
