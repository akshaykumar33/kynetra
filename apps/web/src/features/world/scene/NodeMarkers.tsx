'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import { Html } from '@react-three/drei';
import type { InnovationTowerFloor } from '@kynetra/contracts';
import { nodeWorldPosition } from '../geometry';
import { NODE_TYPE_LABEL } from '../labels';
import type { ScenePalette } from '../hooks/useScenePalette';

interface NodeMarkersProps {
  center: [number, number];
  floor: InnovationTowerFloor;
  selectedNodeId: string | null;
  palette: ScenePalette;
  /** Holds the selected pin's pulse still. */
  reducedMotion: boolean;
  onSelectNode: (nodeId: string) => void;
}

/** Interactive objects on the exposed floor, drawn as pins on the floor plate. */
export function NodeMarkers({
  center,
  floor,
  selectedNodeId,
  palette,
  reducedMotion,
  onSelectNode,
}: NodeMarkersProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pulse = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const ring = pulse.current;
    if (!ring) return;
    const t = reducedMotion ? 0 : (clock.elapsedTime % 1.6) / 1.6;
    ring.scale.setScalar(1 + t * 1.4);
    (ring.material as MeshBasicMaterial).opacity = reducedMotion ? 0.35 : 0.6 * (1 - t);
  });

  useEffect(() => {
    if (!hoveredId) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hoveredId]);

  return (
    <group position={[center[0], 0, center[1]]}>
      {floor.nodes.map((node) => {
        const [x, y, z] = nodeWorldPosition(node, floor.floorNumber);
        const isSelected = node.id === selectedNodeId;
        const isHot = isSelected || node.id === hoveredId;
        return (
          <group key={node.id} position={[x, y, z]}>
            <mesh
              position={[0, 0.3, 0]}
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(node.id);
              }}
              onPointerOut={() => setHoveredId(null)}
            >
              <cylinderGeometry args={[0.13, 0.13, 0.6, 16]} />
              <meshStandardMaterial
                color={isHot ? palette.accent : palette.tower}
                emissive={palette.accent}
                emissiveIntensity={isSelected ? 0.8 : isHot ? 0.4 : 0.15}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.22, isSelected ? 0.38 : 0.3, 32]} />
              <meshBasicMaterial color={palette.accent} transparent opacity={isHot ? 0.9 : 0.5} />
            </mesh>
            {isSelected && (
              <mesh ref={pulse} position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.38, 0.44, 32]} />
                <meshBasicMaterial color={palette.accent} transparent depthWrite={false} />
              </mesh>
            )}
            {isSelected && (
              <Html position={[0, 1.05, 0]} center className="scene-label" zIndexRange={[10, 0]}>
                <span className="scene-label__type">{NODE_TYPE_LABEL[node.type]}</span>
                <span className="scene-label__name">{node.name}</span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
