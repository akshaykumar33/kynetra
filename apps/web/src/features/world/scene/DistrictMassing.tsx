'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Object3D, type InstancedMesh } from 'three';
import type { WorldDistrict } from '@kynetra/contracts';
import { DISTRICT_RADIUS, districtBlocks, districtCenter } from '../geometry';
import type { ScenePalette } from '../hooks/useScenePalette';
import { createFacadeMaterial, updateFacade } from './facadeMaterial';

interface DistrictMassingProps {
  district: WorldDistrict;
  isSelected: boolean;
  palette: ScenePalette;
  litRatio: number;
  onSelect: (districtId: string) => void;
}

/**
 * A district's buildings as a single instanced mesh (one draw call however
 * many blocks) with procedural facades, plus its plaza and boundary ring.
 * The ring carries state: accent when selected, amber while under construction.
 */
export function DistrictMassing({
  district,
  isSelected,
  palette,
  litRatio,
  onSelect,
}: DistrictMassingProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);
  const blocks = useMemo(() => districtBlocks(district), [district]);
  const [cx, cz] = districtCenter(district);
  const building = isSelected || hovered ? palette.buildingActive : palette.building;
  // Sites under construction are dark: nobody works there yet.
  const lit = district.status === 'active' ? litRatio : 0;

  // The shader compiles once per district; colours update in place below.
  const [material] = useState(() =>
    createFacadeMaterial({
      bayWidth: 0.42,
      storeyHeight: 0.36,
      plinth: 0.22,
      litRatio: lit,
      windowGlow: palette.windowGlow,
      glass: palette.glass,
      color: building,
      roughness: 0.78,
      metalness: 0.05,
    }),
  );

  useEffect(() => {
    material.color.set(building);
    updateFacade(material, { windowGlow: palette.windowGlow, glass: palette.glass, litRatio: lit });
  }, [material, building, palette.windowGlow, palette.glass, lit]);

  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    blocks.forEach((block, i) => {
      dummy.position.set(block.x, block.height / 2, block.z);
      dummy.scale.set(block.width, block.height, block.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  const ringColor = isSelected
    ? palette.accent
    : district.status === 'active'
      ? palette.gridMajor
      : palette.warn;

  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(district.id);
  };

  return (
    <group>
      <mesh position={[cx, 0.01, cz]} rotation-x={-Math.PI / 2} receiveShadow onClick={select}>
        <circleGeometry args={[DISTRICT_RADIUS + 0.6, 64]} />
        <meshStandardMaterial color={palette.road} roughness={0.95} />
      </mesh>
      <mesh position={[cx, 0.02, cz]} rotation-x={-Math.PI / 2}>
        <ringGeometry
          args={[DISTRICT_RADIUS + 0.6, DISTRICT_RADIUS + (isSelected ? 0.85 : 0.72), 96]}
        />
        <meshBasicMaterial color={ringColor} toneMapped={false} />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, material, blocks.length]}
        castShadow
        receiveShadow
        onClick={select}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}
