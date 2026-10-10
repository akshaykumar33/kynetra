import { Html, OrbitControls, Sky } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture,
  Color,
  InstancedMesh,
  MathUtils,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import type { Campus, CampusBuilding } from '../api';

const STOREY = 3.6; // metres per level
const RING = 125; // the ring road runs around the park at this distance from the centre

/** Deterministic pseudo-random numbers so every visit shows the same lit windows. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * A facade texture: a grid of windows, some lit warm, some dark, with the tenant's own floor (if any)
 * lit in the brand teal. One column of the texture is one window bay; it repeats around the tower.
 */
function facadeTexture(b: CampusBuilding, highlightLevel: number | null) {
  const cols = 8;
  const px = 32;
  const canvas = document.createElement('canvas');
  canvas.width = cols * px;
  canvas.height = b.levels * px;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0d1820';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const rand = rng(hash(b.id));
  for (let level = 0; level < b.levels; level++) {
    const y = canvas.height - (level + 1) * px; // level 0 at the bottom
    const ours = highlightLevel !== null && level + 1 === highlightLevel;
    for (let c = 0; c < cols; c++) {
      const lit = ours || rand() < 0.55;
      ctx.fillStyle = ours ? '#5fd3e6' : lit ? (rand() < 0.75 ? '#ffd58a' : '#fff1cf') : '#1d3140';
      ctx.fillRect(c * px + 4, y + 5, px - 8, px - 11);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  return tex;
}

function Tower({
  b,
  mineLevel,
  selected,
  onSelect,
}: {
  b: CampusBuilding;
  mineLevel: number | null;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const height = b.levels * STOREY;
  const [hover, setHover] = useState(false);
  const mat = useRef<MeshStandardMaterial>(null);
  const tex = useMemo(() => {
    const t = facadeTexture(b, mineLevel);
    // repeat the 8-bay pattern so windows are ~4 m wide on every face
    t.repeat.set(Math.max(1, Math.round(b.width / 32)), 1);
    return t;
  }, [b, mineLevel]);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const pulse = selected ? 0.15 * Math.sin(clock.elapsedTime * 3) : 0;
    mat.current.emissiveIntensity = (hover || selected ? 1.25 : 0.95) + pulse;
  });

  return (
    <group position={[b.x, 0, b.z]}>
      {/* podium */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[b.width + 6, 4, b.depth + 6]} />
        <meshStandardMaterial color="#d8d2c6" roughness={0.8} />
      </mesh>
      {/* glass tower: base colour from the building, windows glow through the emissive map */}
      <mesh
        position={[0, 4 + height / 2, 0]}
        castShadow
        receiveShadow
        onClick={e => {
          e.stopPropagation();
          onSelect(b.id);
        }}
        onPointerOver={e => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[b.width, height, b.depth]} />
        <meshStandardMaterial
          ref={mat}
          color={b.color}
          metalness={0.55}
          roughness={0.25}
          emissive="#ffffff"
          emissiveMap={tex}
          emissiveIntensity={0.95}
        />
      </mesh>
      {/* crown and roof plant */}
      <mesh position={[0, 4 + height + 1.2, 0]} castShadow>
        <boxGeometry args={[b.width * 0.7, 2.4, b.depth * 0.7]} />
        <meshStandardMaterial color="#5c6b75" roughness={0.6} />
      </mesh>
      {b.levels >= 15 && (
        <mesh position={[0, 4 + height + 2.4 + 6, 0]}>
          <cylinderGeometry args={[0.25, 0.4, 12, 8]} />
          <meshStandardMaterial color="#9aa5ad" metalness={0.8} roughness={0.3} />
        </mesh>
      )}
      {b.levels >= 15 && (
        <mesh position={[0, 4 + height + 14.6, 0]}>
          <sphereGeometry args={[0.5, 12, 8]} />
          <meshBasicMaterial color="#ff5a4a" />
        </mesh>
      )}
      {mineLevel !== null && <Beacon height={4 + height + 3} radius={Math.max(b.width, b.depth) * 0.75} />}
      <Html position={[0, 4 + height + (b.levels >= 15 ? 18 : 6), 0]} center distanceFactor={420} zIndexRange={[5, 0]}>
        <div className={`tower-tag${mineLevel !== null ? ' mine' : ''}${selected ? ' selected' : ''}`}>
          {b.name}
          {mineLevel !== null && <small>Your office · Floor {mineLevel}</small>}
        </div>
      </Html>
    </group>
  );
}

/** A soft teal ring of light above your company's tower so you can spot it from anywhere. */
function Beacon({ height, radius }: { height: number; radius: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.elapsedTime * 0.4;
    ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.04);
  });
  return (
    <mesh ref={ref} position={[0, height, 0]} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[radius, 0.35, 8, 64]} />
      <meshBasicMaterial color="#5fd3e6" transparent opacity={0.85} />
    </mesh>
  );
}

/** Trees and street lights, instanced: hundreds of objects for a handful of draw calls. */
function Greenery() {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const spots = useMemo(() => {
    const rand = rng(42);
    const out: [number, number, number][] = [];
    // avenues of trees on both sides of the ring road
    for (let i = -132; i <= 132; i += 12) {
      for (const side of [-1, 1]) {
        for (const off of [RING - 10, RING + 10]) {
          out.push([i, 0, side * off]);
          out.push([side * off, 0, i]);
        }
      }
    }
    // scattered park trees outside the ring, and a few between towers
    while (out.length < 420) {
      const x = (rand() - 0.5) * 520;
      const z = (rand() - 0.5) * 520;
      const r = Math.max(Math.abs(x), Math.abs(z));
      if (r > RING - 14 && r < RING + 14) continue;
      if (r < RING - 14 && !(Math.abs(x) > 98 || (Math.abs(z) > 70 && Math.abs(x) < 40 && Math.abs(z) < 75))) continue;
      out.push([x, 0, z]);
    }
    return out.map(([x, , z]) => [x, 0.6 + rand() * 0.8, z] as [number, number, number]);
  }, []);
  useEffect(() => {
    const d = new Object3D();
    spots.forEach(([x, s, z], i) => {
      d.position.set(x, 1.5 * s, z);
      d.scale.setScalar(s);
      d.updateMatrix();
      trunks.current?.setMatrixAt(i, d.matrix);
      d.position.set(x, 5 * s, z);
      d.updateMatrix();
      crowns.current?.setMatrixAt(i, d.matrix);
      crowns.current?.setColorAt(i, new Color().setHSL(0.27 + (i % 7) * 0.012, 0.42, 0.33 + (i % 5) * 0.02));
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true;
      if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true;
    }
  }, [spots]);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.length]} castShadow>
        <cylinderGeometry args={[0.3, 0.45, 3, 6]} />
        <meshStandardMaterial color="#6b4f37" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, spots.length]} castShadow>
        <icosahedronGeometry args={[2.8, 0]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
    </>
  );
}

/** Cars looping the two avenues, with headlights. */
function Traffic() {
  const cars = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const fleet = useMemo(() => {
    const rand = rng(7);
    return Array.from({ length: 18 }, (_, i) => ({
      axis: i % 2, // 0 along x, 1 along z
      lane: (i % 2 ? -RING : RING) + (i % 4 < 2 ? -3.2 : 3.2),
      dir: i % 4 < 2 ? 1 : -1,
      offset: rand() * 400,
      speed: 9 + rand() * 6,
      color: new Color().setHSL(rand(), 0.45, 0.45 + rand() * 0.2),
    }));
  }, []);
  const d = useMemo(() => new Object3D(), []);
  useEffect(() => {
    fleet.forEach((c, i) => cars.current?.setColorAt(i, c.color));
    if (cars.current?.instanceColor) cars.current.instanceColor.needsUpdate = true;
  }, [fleet]);
  useFrame(({ clock }) => {
    if (!cars.current || !lights.current) return;
    fleet.forEach((c, i) => {
      const s = ((((c.offset + clock.elapsedTime * c.speed * c.dir) % 300) + 300) % 300) - 150;
      const along = c.axis === 0 ? new Vector3(s, 0.9, c.lane) : new Vector3(c.lane, 0.9, s);
      d.position.copy(along);
      d.rotation.set(0, c.axis === 0 ? (c.dir > 0 ? 0 : Math.PI) : c.dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      d.updateMatrix();
      cars.current!.setMatrixAt(i, d.matrix);
      d.translateX(2.3);
      d.updateMatrix();
      lights.current!.setMatrixAt(i, d.matrix);
    });
    cars.current.instanceMatrix.needsUpdate = true;
    lights.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={cars} args={[undefined, undefined, fleet.length]} castShadow>
        <boxGeometry args={[4.4, 1.5, 2]} />
        <meshStandardMaterial roughness={0.4} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, fleet.length]}>
        <boxGeometry args={[0.2, 0.4, 1.6]} />
        <meshBasicMaterial color="#fff6d8" />
      </instancedMesh>
    </>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#7f9b6a" roughness={1} />
      </mesh>
      {/* the ring road around the park */}
      {[-1, 1].flatMap(side =>
        [0, 1].map(axis => (
          <mesh
            key={side + ':' + axis}
            rotation-x={-Math.PI / 2}
            rotation-z={axis ? Math.PI / 2 : 0}
            position={axis ? [side * RING, 0.03, 0] : [0, 0.03, side * RING]}
            receiveShadow
          >
            <planeGeometry args={[RING * 2 + 12, 12]} />
            <meshStandardMaterial color="#3b4046" roughness={0.95} />
          </mesh>
        )),
      )}
      {/* paved plaza in the middle of the park */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 10]} receiveShadow>
        <planeGeometry args={[130, 110]} />
        <meshStandardMaterial color="#e3dccf" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 42]} castShadow receiveShadow>
        <cylinderGeometry args={[6, 6.6, 0.8, 32]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.85, 42]}>
        <cylinderGeometry args={[5.4, 5.4, 0.1, 32]} />
        <meshStandardMaterial color="#4fa3c4" roughness={0.1} metalness={0.2} />
      </mesh>
    </group>
  );
}

/** Flies the camera to a target smoothly, then hands control back to the orbit controls. */
function CameraRig({ focus }: { focus: CampusBuilding | null }) {
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const goal = useRef<{ pos: Vector3; target: Vector3; t: number } | null>(null);

  useEffect(() => {
    if (!focus) {
      goal.current = { pos: new Vector3(190, 150, 230), target: new Vector3(0, 20, 0), t: 0 };
      return;
    }
    const h = focus.levels * STOREY;
    const away = new Vector3(focus.x, 0, focus.z)
      .normalize()
      .multiplyScalar(1)
      .add(new Vector3(0.6, 0, 1).normalize());
    goal.current = {
      pos: new Vector3(focus.x, 0, focus.z).add(away.multiplyScalar(Math.max(70, h * 1.3))).setY(h * 0.7 + 25),
      target: new Vector3(focus.x, h * 0.45, focus.z),
      t: 0,
    };
  }, [focus]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls.current) return;
    g.t = Math.min(1, g.t + dt / 1.6);
    const k = 1 - Math.pow(1 - g.t, 3); // ease out
    camera.position.lerp(g.pos, k * 0.12);
    controls.current.target.lerp(g.target, k * 0.12);
    if (g.t >= 1 && camera.position.distanceTo(g.pos) < 0.5) goal.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      minDistance={40}
      maxDistance={520}
      maxPolarAngle={MathUtils.degToRad(84)}
      autoRotate={!focus}
      autoRotateSpeed={0.25}
    />
  );
}

export function CampusScene({
  campus,
  selectedId,
  onSelect,
}: {
  campus: Campus;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selected = campus.buildings.find(b => b.id === selectedId) ?? null;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [260, 210, 320], fov: 40, near: 1, far: 2000 }}
      aria-label={`${campus.name}, shown in 3D`}
      onPointerMissed={() => onSelect(null)}
    >
      <Sky distance={4500} sunPosition={[-200, 38, -300]} turbidity={6} rayleigh={1.6} mieCoefficient={0.006} />
      <fog attach="fog" args={['#efd2b0', 320, 1100]} />
      <hemisphereLight args={['#ffe7c4', '#5d6b52', 0.75]} />
      <directionalLight
        position={[-160, 120, -120]}
        intensity={2.1}
        color="#ffc98f"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-camera-far={600}
      />
      <Ground />
      <Greenery />
      <Traffic />
      {campus.buildings.map(b => (
        <Tower
          key={b.id}
          b={b}
          mineLevel={campus.mine?.buildingId === b.id ? campus.mine.level : null}
          selected={b.id === selectedId}
          onSelect={onSelect}
        />
      ))}
      <CameraRig focus={selected} />
    </Canvas>
  );
}
