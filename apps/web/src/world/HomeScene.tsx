import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { dayPhase, type DayPhase, type HomeDecor, type HomeItem, type HomeStyle } from '@kynetra/shared';
import { useMemo, useRef } from 'react';
import { MathUtils, type Group, type Mesh, type PointLight } from 'three';

const W = 12; // room width (x)
const D = 10; // room depth (z)
const H = 3.4; // ceiling height

const FLOOR: Record<HomeStyle, string> = {
  cabin: '#8a5a36',
  loft: '#9a9894',
  jungle: '#b08d57',
  neon: '#2a2540',
};

const SKY: Record<DayPhase, { sky: string; ambient: number; sun: number; sunColor: string }> = {
  morning: { sky: '#ffd9b0', ambient: 0.55, sun: 1.4, sunColor: '#ffd2a0' },
  day: { sky: '#9fd3f0', ambient: 0.75, sun: 1.8, sunColor: '#fff3df' },
  golden: { sky: '#f6a65c', ambient: 0.5, sun: 1.3, sunColor: '#ffb067' },
  night: { sky: '#151b38', ambient: 0.18, sun: 0.15, sunColor: '#8fa3ff' },
};

type Vec3 = [number, number, number];

function Box({ p, s, c, r = 0.8, m = 0, e }: { p: Vec3; s: Vec3; c: string; r?: number; m?: number; e?: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={r}
        metalness={m}
        emissive={e ?? '#000000'}
        emissiveIntensity={e ? 1 : 0}
      />
    </mesh>
  );
}

function Room({ decor, phase }: { decor: HomeDecor; phase: DayPhase }) {
  const sky = SKY[phase];
  return (
    <group>
      {/* floor and ceiling */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={FLOOR[decor.style]} roughness={decor.style === 'loft' ? 0.6 : 0.9} />
      </mesh>
      {/* back and left walls; the right wall holds the big window */}
      <Box p={[0, H / 2, -D / 2]} s={[W, H, 0.2]} c={decor.wall} r={0.95} />
      <Box p={[-W / 2, H / 2, 0]} s={[0.2, H, D]} c={decor.wall} r={0.95} />
      <Box p={[W / 2, 0.45, 0]} s={[0.2, 0.9, D]} c={decor.wall} r={0.95} />
      <Box p={[W / 2, H - 0.3, 0]} s={[0.2, 0.6, D]} c={decor.wall} r={0.95} />
      <Box p={[W / 2, H / 2, -D / 2 + 0.6]} s={[0.2, H, 1.2]} c={decor.wall} r={0.95} />
      <Box p={[W / 2, H / 2, D / 2 - 0.6]} s={[0.2, H, 1.2]} c={decor.wall} r={0.95} />
      {/* the view: sky through the glass, with stars and a moon at night */}
      <mesh position={[W / 2 + 3, H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[14, 8]} />
        <meshBasicMaterial color={sky.sky} />
      </mesh>
      {phase === 'night' && <NightSky />}
      {/* window frame */}
      <Box p={[W / 2, H / 2 + 0.1, 0]} s={[0.12, 0.06, D - 2.4]} c="#3a3a3a" m={0.4} />
      <Box p={[W / 2, H / 2 + 0.1, 0]} s={[0.12, H - 1.5, 0.06]} c="#3a3a3a" m={0.4} />
      {decor.style === 'neon' && <NeonStrips />}
      {decor.style === 'cabin' && <Panelling />}
    </group>
  );
}

function NightSky() {
  const stars = useMemo(
    () =>
      Array.from(
        { length: 40 },
        (_, i) => [W / 2 + 2.9, 0.6 + ((i * 37) % 70) / 18, -4 + ((i * 53) % 80) / 10] as Vec3,
      ),
    [],
  );
  return (
    <group>
      {stars.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.025 + (i % 3) * 0.012, 6, 4]} />
          <meshBasicMaterial color="#fff9e0" />
        </mesh>
      ))}
      <mesh position={[W / 2 + 2.8, 2.6, 2]}>
        <sphereGeometry args={[0.35, 24, 16]} />
        <meshBasicMaterial color="#f4f1d8" />
      </mesh>
    </group>
  );
}

function NeonStrips() {
  return (
    <group>
      {(
        [
          [[0, H - 0.05, -D / 2 + 0.15], [W - 0.4, 0.06, 0.06], '#ff3fb4'],
          [[-W / 2 + 0.15, H - 0.05, 0], [0.06, 0.06, D - 0.4], '#3fe0ff'],
        ] as [Vec3, Vec3, string][]
      ).map(([p, s, c]) => (
        <mesh key={c} position={p}>
          <boxGeometry args={s} />
          <meshBasicMaterial color={c} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, H - 0.4, -D / 2 + 0.6]} color="#ff3fb4" intensity={14} distance={11} />
      <pointLight position={[-W / 2 + 0.6, H - 0.4, 0]} color="#3fe0ff" intensity={14} distance={11} />
    </group>
  );
}

/** Cabin panelling: warm boards up to dado height, so the room reads as timber without hiding it. */ function Panelling() {
  return (
    <group>
      {' '}
      <Box p={[0, 0.6, -D / 2 + 0.12]} s={[W, 1.2, 0.06]} c="#7a4e2d" r={0.9} />{' '}
      <Box p={[-W / 2 + 0.12, 0.6, 0]} s={[0.06, 1.2, D]} c="#7a4e2d" r={0.9} />{' '}
      <Box p={[0, 1.22, -D / 2 + 0.14]} s={[W, 0.06, 0.1]} c="#5b3b22" />{' '}
      <Box p={[-W / 2 + 0.14, 1.22, 0]} s={[0.1, 0.06, D]} c="#5b3b22" />{' '}
    </group>
  );
}

/* ---------- furniture: each has one spot, so any combination looks arranged ---------- */

function Sofa({ decor }: { decor: HomeDecor }) {
  const fabric = { cabin: '#7b4b3a', loft: '#5e6670', jungle: '#d9c79a', neon: '#3b2a6b' }[decor.style];
  return (
    <group position={[-2, 0, 2.3]}>
      <Box p={[0, 0.3, 0]} s={[3, 0.45, 1.1]} c={fabric} />
      <Box p={[0, 0.75, 0.45]} s={[3, 0.7, 0.25]} c={fabric} />
      <Box p={[-1.45, 0.55, 0]} s={[0.2, 0.55, 1.1]} c={fabric} />
      <Box p={[1.45, 0.55, 0]} s={[0.2, 0.55, 1.1]} c={fabric} />
      <Box p={[-0.7, 0.62, 0.1]} s={[0.55, 0.3, 0.4]} c="#e9d8b8" />
    </group>
  );
}

function Desk() {
  return (
    <group position={[3.3, 0, -3.6]}>
      <Box p={[0, 0.74, 0]} s={[2, 0.06, 0.9]} c="#c9a77c" />
      {[-0.9, 0.9].map(x => (
        <Box key={x} p={[x, 0.37, 0]} s={[0.06, 0.74, 0.8]} c="#2f2f2f" m={0.5} />
      ))}
      <Box p={[0, 1.08, -0.25]} s={[0.9, 0.55, 0.04]} c="#1d1f24" e="#26364a" />
      <Box p={[0, 0.79, 0.15]} s={[0.6, 0.02, 0.2]} c="#dedede" />
      <Box p={[0, 0.45, 0.8]} s={[0.55, 0.08, 0.55]} c="#333" />
    </group>
  );
}

function Bookshelf() {
  const colors = ['#b23a48', '#3c6e71', '#f2c14e', '#5b5f97', '#e07a5f', '#81b29a'];
  return (
    <group position={[-W / 2 + 0.35, 0, -2]}>
      <Box p={[0, 1.1, 0]} s={[0.5, 2.2, 1.8]} c="#6b4a2e" />
      {[0.35, 0.95, 1.55].map((y, row) =>
        Array.from({ length: 7 }, (_, i) => (
          <Box
            key={`${row}-${i}`}
            p={[0.12, y + 0.22, -0.72 + i * 0.22]}
            s={[0.3, 0.4 + ((i + row) % 3) * 0.05, 0.16]}
            c={colors[(i + row * 2) % colors.length]}
          />
        )),
      )}
    </group>
  );
}

function Plant({ p, still, scale = 1 }: { p: Vec3; still: boolean; scale?: number }) {
  const leaves = useRef<Group>(null);
  const seed = p[0] * 3 + p[2];
  useFrame(({ clock }) => {
    if (!leaves.current || still) return;
    leaves.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + seed) * 0.04;
  });
  return (
    <group position={p} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.5, 16]} />
        <meshStandardMaterial color="#c56a4a" roughness={0.8} />
      </mesh>
      <group ref={leaves} position={[0, 0.5, 0]}>
        {[0, 1, 2, 3, 4].map(i => (
          <mesh key={i} position={[Math.cos(i * 1.3) * 0.2, 0.35 + i * 0.12, Math.sin(i * 1.3) * 0.2]} castShadow>
            <sphereGeometry args={[0.28 - i * 0.03, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? '#3f7d3a' : '#5a9a48'} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Plants({ still, many }: { still: boolean; many: boolean }) {
  return (
    <>
      <Plant p={[W / 2 - 0.6, 0, -D / 2 + 1.7]} still={still} />
      <Plant p={[-W / 2 + 0.7, 0, D / 2 - 0.7]} still={still} scale={1.3} />
      {many && <Plant p={[0.4, 0, -D / 2 + 0.6]} still={still} scale={1.5} />}
      {many && <Plant p={[W / 2 - 0.6, 0, D / 2 - 1.7]} still={still} scale={0.8} />}
    </>
  );
}

function Fireplace({ still, night }: { still: boolean; night: boolean }) {
  const light = useRef<PointLight>(null);
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = still ? 1 : 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17.3) * 0.07;
    if (light.current) light.current.intensity = (night ? 7 : 3) * flicker;
    if (flame.current) flame.current.scale.y = flicker;
  });
  return (
    <group position={[-1.6, 0, -D / 2 + 0.45]}>
      <Box p={[0, 0.75, 0]} s={[2.2, 1.5, 0.7]} c="#8c8178" r={0.95} />
      <Box p={[0, 0.55, 0.2]} s={[1.3, 0.9, 0.4]} c="#1b1512" />
      <Box p={[0, 1.55, 0.05]} s={[2.5, 0.12, 0.85]} c="#5b3b22" />
      <mesh ref={flame} position={[0, 0.45, 0.25]}>
        <coneGeometry args={[0.32, 0.7, 12]} />
        <meshBasicMaterial color="#ff9a3c" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.8, 0.9]} color="#ff9a4a" distance={8} castShadow={false} />
    </group>
  );
}

function Records({ still }: { still: boolean }) {
  const vinyl = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (vinyl.current && !still) vinyl.current.rotation.y += dt * 3.5;
  });
  return (
    <group position={[4.6, 0, 2.6]}>
      <Box p={[0, 0.35, 0]} s={[1.1, 0.7, 0.6]} c="#3a2d24" />
      <Box p={[0, 0.76, 0]} s={[0.8, 0.12, 0.55]} c="#c9a77c" />
      <mesh ref={vinyl} position={[-0.05, 0.84, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.015, 32]} />
        <meshStandardMaterial color="#111" roughness={0.3} />
      </mesh>
      <mesh position={[-0.05, 0.85, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
        <meshStandardMaterial color="#e5484d" />
      </mesh>
    </group>
  );
}

function Fish({ i, still }: { i: number; still: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = still ? i : clock.elapsedTime * (0.6 + i * 0.15) + i * 2;
    ref.current.position.set(Math.sin(t) * 0.5, 0.95 + Math.sin(t * 1.7) * 0.1 + i * 0.08, Math.cos(t) * 0.18);
    ref.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <mesh ref={ref}>
      <coneGeometry args={[0.05, 0.16, 8]} />
      <meshStandardMaterial color={['#ff8c42', '#ffd23f', '#3fc1ff'][i % 3]} />
    </mesh>
  );
}

function Aquarium({ still }: { still: boolean }) {
  return (
    <group position={[-W / 2 + 0.45, 0, 2.2]} rotation-y={Math.PI / 2}>
      <Box p={[0, 0.35, 0]} s={[1.5, 0.7, 0.6]} c="#2e2a26" />
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.4, 0.7, 0.5]} />
        <meshPhysicalMaterial color="#7fd3e8" transmission={0.6} transparent opacity={0.45} roughness={0.05} />
      </mesh>
      {[0, 1, 2].map(i => (
        <Fish key={i} i={i} still={still} />
      ))}
      <pointLight position={[0, 1.2, 0.4]} color="#5fd3ff" intensity={1.2} distance={3} />
    </group>
  );
}

function Telescope() {
  return (
    <group position={[W / 2 - 1.2, 0, 0.6]}>
      {[0, 2.1, 4.2].map(a => (
        <mesh
          key={a}
          position={[Math.cos(a) * 0.25, 0.55, Math.sin(a) * 0.25]}
          rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}
        >
          <cylinderGeometry args={[0.025, 0.025, 1.15, 6]} />
          <meshStandardMaterial color="#4a3b2c" />
        </mesh>
      ))}
      <mesh position={[0.1, 1.25, 0]} rotation-z={-Math.PI / 3}>
        <cylinderGeometry args={[0.09, 0.13, 1.1, 16]} />
        <meshStandardMaterial color="#c9b26b" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Rug({ style }: { style: HomeStyle }) {
  const c = { cabin: '#a8443a', loft: '#d8d2c6', jungle: '#6f8f4e', neon: '#5a2a8c' }[style];
  return (
    <mesh rotation-x={-Math.PI / 2} position={[-2, 0.01, 1.3]} receiveShadow>
      <circleGeometry args={[2.2, 48]} />
      <meshStandardMaterial color={c} roughness={1} />
    </mesh>
  );
}

function Lamp({ night }: { night: boolean }) {
  return (
    <group position={[-W / 2 + 0.7, 0, 4.2]}>
      <Box p={[0, 0.03, 0]} s={[0.4, 0.06, 0.4]} c="#222" m={0.6} />
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.7, 8]} />
        <meshStandardMaterial color="#222" metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.18, 0.3, 0.35, 20, 1, true]} />
        <meshStandardMaterial color="#f3e3c3" emissive="#ffcf87" emissiveIntensity={night ? 1.2 : 0.2} side={2} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color="#ffcf87" intensity={night ? 5 : 1} distance={7} />
    </group>
  );
}

const ITEMS: Record<HomeItem, (a: { decor: HomeDecor; still: boolean; night: boolean }) => JSX.Element> = {
  sofa: ({ decor }) => <Sofa decor={decor} />,
  desk: () => <Desk />,
  bookshelf: () => <Bookshelf />,
  plants: ({ decor, still }) => <Plants still={still} many={decor.style === 'jungle'} />,
  fireplace: ({ still, night }) => <Fireplace still={still} night={night} />,
  records: ({ still }) => <Records still={still} />,
  aquarium: ({ still }) => <Aquarium still={still} />,
  telescope: () => <Telescope />,
  rug: ({ decor }) => <Rug style={decor.style} />,
  lamp: ({ night }) => <Lamp night={night} />,
};

/** Inside a home: the owner's style, wall and furniture, lit for the viewer's time of day. */
export function HomeScene({ decor, name, hour }: { decor: HomeDecor; name: string; hour: number }) {
  const phase = dayPhase(hour);
  const night = phase === 'night';
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const sky = SKY[phase];
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [-1, 6.5, 11], fov: 45 }}
      aria-label={`Inside ${name}, shown in 3D`}
    >
      <color attach="background" args={[night ? '#0e1022' : '#e9e2d6']} />
      <ambientLight intensity={sky.ambient + (decor.style === 'neon' ? 0.35 : 0)} />
      <hemisphereLight args={['#fff4e0', '#4a3b2c', sky.ambient * 0.6]} />
      {/* daylight pours in through the window wall */}
      <directionalLight
        position={[14, 6, 2]}
        intensity={sky.sun}
        color={sky.sunColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <Room decor={decor} phase={phase} />
      {decor.items.map(item => {
        const Item = ITEMS[item];
        return <Item key={item} decor={decor} still={still} night={night} />;
      })}
      <OrbitControls
        makeDefault
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={5}
        maxDistance={14}
        minAzimuthAngle={MathUtils.degToRad(-70)}
        maxAzimuthAngle={MathUtils.degToRad(55)}
        maxPolarAngle={MathUtils.degToRad(80)}
      />
    </Canvas>
  );
}
