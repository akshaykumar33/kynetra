'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MathUtils, type Group } from 'three';
import {
  FLOOR_HEIGHT,
  PODIUM_HEIGHT,
  SLAB_THICKNESS,
  TOWER_WIDTH,
  levelOffset,
  type TowerLevel as TowerLevelData,
} from '../geometry';
import { formatCount } from '../labels';
import type { ScenePalette } from '../hooks/useScenePalette';
import { createFacadeMaterial, updateFacade } from './facadeMaterial';

const GLASS_HEIGHT = FLOOR_HEIGHT - SLAB_THICKNESS;
/** Exponential damping rate for the explode animation (higher settles faster). */
const LIFT_DAMPING = 7;
/** Curtain-wall mullion spacing. */
const MULLION_BAY = 0.52;

interface TowerProps {
  center: [number, number];
  levels: TowerLevelData[];
  selectedFloor: number | null;
  palette: ScenePalette;
  litRatio: number;
  reducedMotion: boolean;
  onSelectFloor: (floorNumber: number) => void;
}

/**
 * The Innovation Tower as stacked levels behind a mullioned curtain wall.
 * Selecting a programmed floor lifts every level above it, exposing the floor
 * plate like an architectural section — the user sees inside without leaving
 * the city view.
 */
export function Tower({
  center,
  levels,
  selectedFloor,
  palette,
  litRatio,
  reducedMotion,
  onSelectFloor,
}: TowerProps) {
  const top = levels.length * FLOOR_HEIGHT;
  const crownLift = levelOffset(levels.length + 1, selectedFloor);

  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh position={[0, PODIUM_HEIGHT / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[TOWER_WIDTH + 2.4, PODIUM_HEIGHT, TOWER_WIDTH + 2.4]} />
        <meshStandardMaterial color={palette.tower} roughness={0.85} />
      </mesh>

      <group position={[0, PODIUM_HEIGHT, 0]}>
        {levels.map((level) => (
          <TowerLevel
            key={level.level}
            data={level}
            lift={levelOffset(level.level, selectedFloor)}
            isSelected={level.floor !== null && level.floor.floorNumber === selectedFloor}
            isExposed={selectedFloor !== null}
            palette={palette}
            litRatio={litRatio}
            reducedMotion={reducedMotion}
            onSelectFloor={onSelectFloor}
          />
        ))}

        <LiftingGroup baseY={top} lift={crownLift} reducedMotion={reducedMotion}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[TOWER_WIDTH + 0.4, 0.28, TOWER_WIDTH + 0.4]} />
            <meshStandardMaterial color={palette.tower} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[-0.6, 0.55, 0.4]} castShadow>
            <boxGeometry args={[1.6, 0.55, 1.2]} />
            <meshStandardMaterial color={palette.buildingActive} roughness={0.7} />
          </mesh>
          <mesh position={[0.9, 1.4, -0.9]} castShadow>
            <cylinderGeometry args={[0.04, 0.07, 2.4, 8]} />
            <meshStandardMaterial color={palette.tower} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Aviation warning light */}
          <mesh position={[0.9, 2.65, -0.9]}>
            <sphereGeometry args={[0.07, 12, 8]} />
            <meshBasicMaterial color={palette.taillight} toneMapped={false} />
          </mesh>
        </LiftingGroup>
      </group>
    </group>
  );
}

function LiftingGroup({
  baseY,
  lift,
  reducedMotion,
  children,
}: {
  baseY: number;
  lift: number;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const target = baseY + lift;
  // Only the first render places the group; afterwards useFrame owns its height,
  // otherwise every re-render would snap it to the target and skip the easing.
  const [initialY] = useState(target);

  useEffect(() => invalidate(), [target, invalidate]);

  useFrame((state, delta) => {
    const group = ref.current;
    if (!group) return;
    if (reducedMotion) {
      group.position.y = target;
      return;
    }
    group.position.y = MathUtils.damp(group.position.y, target, LIFT_DAMPING, delta);
    if (Math.abs(group.position.y - target) > 0.001) state.invalidate();
    else group.position.y = target;
  });

  return (
    <group ref={ref} position={[0, initialY, 0]}>
      {children}
    </group>
  );
}

interface TowerLevelProps {
  data: TowerLevelData;
  lift: number;
  isSelected: boolean;
  isExposed: boolean;
  palette: ScenePalette;
  litRatio: number;
  reducedMotion: boolean;
  onSelectFloor: (floorNumber: number) => void;
}

function TowerLevel({
  data,
  lift,
  isSelected,
  isExposed,
  palette,
  litRatio,
  reducedMotion,
  onSelectFloor,
}: TowerLevelProps) {
  const [hovered, setHovered] = useState(false);
  const programmed = data.floor;
  const interactive = programmed !== null;
  // Programmed floors are busier, so more of their lights are on at dusk.
  const lit = litRatio > 0 ? Math.min(1, litRatio * (interactive ? 1.9 : 1)) : 0;

  const [glass] = useState(() =>
    createFacadeMaterial({
      bayWidth: MULLION_BAY,
      storeyHeight: FLOOR_HEIGHT,
      // Offset so each slab's glass falls inside one storey cell.
      plinth: PODIUM_HEIGHT + SLAB_THICKNESS,
      rows: false,
      litRatio: lit,
      windowGlow: palette.windowGlow,
      glass: palette.glass,
      color: palette.tower,
      roughness: 0.25,
      metalness: 0.5,
      transparent: true,
    }),
  );

  // Glass reads solid at rest, clears on the exposed floor so its nodes show.
  const opacity = isSelected ? 0.14 : isExposed ? 0.6 : 0.95;
  const emissiveIntensity = isSelected ? 0.5 : hovered ? 0.3 : 0;

  useEffect(() => {
    styleGlass(glass, {
      palette,
      emissiveIntensity,
      opacity,
      isSelected,
      litRatio: isSelected ? 0 : lit,
    });
  }, [glass, palette, opacity, emissiveIntensity, isSelected, lit]);

  useEffect(() => () => glass.dispose(), [glass]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelectFloor(programmed.floorNumber);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
        },
        onPointerOut: () => setHovered(false),
      }
    : {};

  return (
    <LiftingGroup baseY={data.y} lift={lift} reducedMotion={reducedMotion}>
      <mesh position={[0, SLAB_THICKNESS / 2, 0]} castShadow receiveShadow {...handlers}>
        <boxGeometry args={[TOWER_WIDTH + 0.2, SLAB_THICKNESS, TOWER_WIDTH + 0.2]} />
        <meshStandardMaterial
          color={palette.tower}
          roughness={0.7}
          emissive={palette.accent}
          emissiveIntensity={isSelected ? 0.35 : 0}
        />
      </mesh>
      <mesh
        position={[0, SLAB_THICKNESS + GLASS_HEIGHT / 2, 0]}
        castShadow
        material={glass}
        {...handlers}
      >
        <boxGeometry args={[TOWER_WIDTH, GLASS_HEIGHT, TOWER_WIDTH]} />
      </mesh>
      {hovered && programmed && !isSelected && (
        <Html
          position={[TOWER_WIDTH / 2 + 0.3, FLOOR_HEIGHT / 2, TOWER_WIDTH / 2 + 0.3]}
          className="scene-label scene-label--floor"
          zIndexRange={[10, 0]}
        >
          <span className="scene-label__type">
            Floor {programmed.floorNumber} · {formatCount(programmed.currentOccupancy)} here now
          </span>
          <span className="scene-label__name">{programmed.name}</span>
        </Html>
      )}
    </LiftingGroup>
  );
}

type FacadeMaterial = ReturnType<typeof createFacadeMaterial>;

/**
 * Pushes the level's state into its glass. Kept outside the component: the
 * material is a mutable three.js object, updated in place rather than rebuilt.
 */
function styleGlass(
  glass: FacadeMaterial,
  state: {
    palette: ScenePalette;
    emissiveIntensity: number;
    opacity: number;
    isSelected: boolean;
    litRatio: number;
  },
) {
  glass.color.set(state.palette.tower);
  glass.emissive.set(state.palette.accent);
  glass.emissiveIntensity = state.emissiveIntensity;
  glass.opacity = state.opacity;
  glass.depthWrite = !state.isSelected;
  updateFacade(glass, {
    windowGlow: state.palette.windowGlow,
    glass: state.palette.glass,
    litRatio: state.litRatio,
  });
}
