import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import type { Group } from 'three';
import type { CampusBuilding } from '../api';
import { Avatar } from './Avatar';

const W = 32; // lobby width
const D = 22; // lobby depth
const H = 7; // ceiling height

function Box({
  p,
  s,
  c,
  r = 0.8,
  m = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  r?: number;
  m?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} />
    </mesh>
  );
}

/** Two brushed-steel doors that slide apart; `open` 0..1 is driven by the lift state. */
function LiftDoors({ x, openRef }: { x: number; openRef: MutableRefObject<number> }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  useFrame(() => {
    const o = openRef.current;
    if (left.current) left.current.position.x = -0.8 - o * 1.4;
    if (right.current) right.current.position.x = 0.8 + o * 1.4;
  });
  return (
    <group position={[x, 0, -D / 2 + 0.25]}>
      {/* the lit lift cabin behind the doors */}
      <Box p={[0, 1.6, -0.6]} s={[3.6, 3.4, 0.1]} c="#e9dcc3" r={0.5} />
      <Box p={[-1.75, 1.6, -0.35]} s={[0.1, 3.4, 0.6]} c="#d9c9ab" />
      <Box p={[1.75, 1.6, -0.35]} s={[0.1, 3.4, 0.6]} c="#d9c9ab" />
      <pointLight position={[0, 3, -0.4]} intensity={3} distance={4} color="#ffe6b8" />
      <group ref={left}>
        <Box p={[0, 1.55, 0]} s={[1.6, 3.1, 0.12]} c="#b9c2c8" r={0.25} m={0.85} />
      </group>
      <group ref={right}>
        <Box p={[0, 1.55, 0]} s={[1.6, 3.1, 0.12]} c="#b9c2c8" r={0.25} m={0.85} />
      </group>
      {/* frame and the little "up" light */}
      <Box p={[0, 3.35, 0.05]} s={[3.8, 0.3, 0.2]} c="#8a7a63" />
      <Box p={[-2, 1.6, 0.05]} s={[0.2, 3.5, 0.2]} c="#8a7a63" />
      <Box p={[2, 1.6, 0.05]} s={[0.2, 3.5, 0.2]} c="#8a7a63" />
      <mesh position={[0, 3.75, 0.1]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#ffcf6b" />
      </mesh>
    </group>
  );
}

function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.35, 0.9, 20]} />
        <meshStandardMaterial color="#efe8dc" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#5b8a45" flatShading roughness={0.8} />
      </mesh>
    </group>
  );
}

export function LobbyScene({
  building,
  me,
  liftOpen,
}: {
  building: CampusBuilding;
  me: { body: string; skin: string; hair: string } | null;
  /** 1 = lift doors open, 0 = closed. Animated by the caller. */
  liftOpen: MutableRefObject<number>;
}) {
  const speed = useRef(0);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 7.5, 19], fov: 45 }}
      aria-label={`${building.name} lobby, shown in 3D`}
    >
      <color attach="background" args={['#efe6d8']} />
      <hemisphereLight args={['#fff4e2', '#b8ab96', 0.9]} />
      <directionalLight
        position={[8, 14, 10]}
        intensity={1.3}
        color="#fff0d8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, H - 0.5, -4]} intensity={20} distance={18} color="#ffd9a0" />

      {/* marble floor with a darker inlay leading to the lifts */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#ece6dc" roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -2]} receiveShadow>
        <planeGeometry args={[4, D - 4]} />
        <meshStandardMaterial color="#8e7f6b" roughness={0.4} />
      </mesh>

      {/* walls: back wall in the building's own colour, timber side walls */}
      <Box p={[0, H / 2, -D / 2]} s={[W, H, 0.3]} c={building.color} r={0.6} />
      <Box p={[-W / 2, H / 2, 0]} s={[0.3, H, D]} c="#b08a63" r={0.7} />
      <Box p={[W / 2, H / 2, 0]} s={[0.3, H, D]} c="#b08a63" r={0.7} />
      {/* no ceiling: the lobby is shown as a cutaway, like the office floor */}
      <Html position={[6.5, 5.3, -D / 2 + 0.2]} center transform distanceFactor={6} zIndexRange={[4, 0]}>
        <div className="lobby-sign">{building.name}</div>
      </Html>

      {/* reception */}
      <Box p={[-9, 0.6, -1]} s={[6, 1.2, 1.6]} c="#2f6f8f" r={0.4} />
      <Box p={[-9, 1.23, -1]} s={[6.2, 0.06, 1.8]} c="#efe6d8" r={0.3} />

      {/* the lifts */}
      <LiftDoors x={4} openRef={liftOpen} />
      <LiftDoors x={9} openRef={liftOpen} />

      {/* seating and plants */}
      <Box p={[10, 0.35, 5]} s={[4, 0.7, 1.4]} c="#7e9a8f" />
      <Box p={[10, 0.8, 5.55]} s={[4, 0.8, 0.3]} c="#6f8a80" />
      <Plant x={-14} z={-9} />
      <Plant x={14} z={-9} />
      <Plant x={-14} z={8} />
      <Plant x={6.5} z={-9.4} />

      {/* you, waiting by the lifts */}
      <group position={[6.5, 0, -6]} rotation-y={Math.PI}>
        <Avatar
          name="You"
          body={me?.body ?? '#2f6f8f'}
          skin={me?.skin ?? '#d6a07a'}
          hair={me?.hair ?? '#3a2416'}
          status="available"
          speedRef={speed}
          isMe
        />
      </group>

      <OrbitControls
        makeDefault
        target={[2, 2, -4]}
        enablePan={false}
        minDistance={10}
        maxDistance={30}
        minPolarAngle={0.6}
        maxPolarAngle={1.35}
        minAzimuthAngle={-0.7}
        maxAzimuthAngle={0.7}
        enableDamping
      />
    </Canvas>
  );
}
