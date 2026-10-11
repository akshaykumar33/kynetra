import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import { type BufferGeometry, type Mesh, type MeshStandardMaterial } from 'three';
import { useOffice, walkTo } from '../state';
import { desks, FLOOR, MY_DESK, ROOM, ROOM_DOOR, zones, type Desk } from '@knovra/shared';

const WOOD = '#d9bf98';
const WALL = '#f4efe7';

function Block({
  p,
  s,
  c,
  r = 0.85,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  r?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} />
    </mesh>
  );
}

function Plant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.5, 16]} />
        <meshStandardMaterial color="#c7764f" roughness={0.9} />
      </mesh>
      {[
        [0, 0.85, 0, 0.36],
        [0.16, 1.1, 0.06, 0.26],
        [-0.14, 1.05, -0.08, 0.28],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i ? '#6f9d55' : '#5b8a45'} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function DeskSet({ d, mine }: { d: Desk; mine?: boolean }) {
  const screen = useRef<Mesh<BufferGeometry, MeshStandardMaterial>>(null);
  useFrame(({ clock }) => {
    if (screen.current)
      screen.current.material.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 0.7 + d.x) * 0.08;
  });
  const back = -d.facing * 0.25;
  return (
    <group position={[d.x, 0, d.z]}>
      <Block p={[0, 0.74, 0]} s={[2, 0.06, 0.9]} c={mine ? '#c9a271' : '#e8dccb'} />
      {[
        [-0.92, -0.38],
        [0.92, -0.38],
        [-0.92, 0.38],
        [0.92, 0.38],
      ].map(([x, z], i) => (
        <Block key={i} p={[x, 0.37, z]} s={[0.05, 0.74, 0.05]} c="#6d6257" />
      ))}
      <Block p={[0, 1.05, back]} s={[0.8, 0.48, 0.04]} c="#2f3437" r={0.4} />
      <mesh ref={screen} position={[0, 1.05, back + d.facing * 0.025]} rotation-y={d.facing === 1 ? 0 : Math.PI}>
        <planeGeometry args={[0.72, 0.4]} />
        <meshStandardMaterial color="#9cc7e6" emissive="#6fb0dd" emissiveIntensity={0.55} />
      </mesh>
      {mine && (
        <>
          <Plant x={0.7} z={back} s={0.45} />
          <Block p={[-0.65, 0.88, 0.1]} s={[0.22, 0.22, 0.03]} c="#f2c14e" />
          <Block p={[-0.3, 0.8, 0.15]} s={[0.12, 0.1, 0.12]} c="#ffffff" />
        </>
      )}
      {/* chair */}
      <group position={[0, 0, d.facing * 0.75]}>
        <Block p={[0, 0.45, 0]} s={[0.5, 0.08, 0.5]} c={mine ? '#2f6f8f' : '#58636b'} />
        <Block p={[0, 0.75, d.facing * 0.24]} s={[0.5, 0.55, 0.06]} c={mine ? '#2f6f8f' : '#58636b'} />
        <Block p={[0, 0.22, 0]} s={[0.06, 0.44, 0.06]} c="#333" />
      </group>
    </group>
  );
}

function Lounge() {
  return (
    <group>
      {/* kitchen counter with coffee machine */}
      <Block p={[-17, 0.5, -12.6]} s={[5, 1, 1.2]} c="#efe6d8" />
      <Block p={[-17, 1.02, -12.6]} s={[5.1, 0.06, 1.3]} c="#7b8c7a" />
      <Block p={[-18.4, 1.3, -12.8]} s={[0.5, 0.5, 0.45]} c="#2c2c2c" r={0.4} />
      <Block p={[-16, 1.12, -12.6]} s={[0.14, 0.16, 0.14]} c="#f7f7f7" />
      <Block p={[-15.6, 1.12, -12.5]} s={[0.14, 0.16, 0.14]} c="#e07a5f" />
      {/* sofa */}
      <Block p={[-9, 0.3, -10]} s={[3.4, 0.6, 1.1]} c="#7e9a8f" />
      <Block p={[-9, 0.75, -10.45]} s={[3.4, 0.7, 0.3]} c="#6f8a80" />
      <Block p={[-9, 0.4, -8.2]} s={[1.6, 0.08, 0.9]} c="#a87c54" />
      <Block p={[-9, 0.2, -8.2]} s={[0.1, 0.4, 0.1]} c="#6d5640" />
      {/* rug */}
      <mesh rotation-x={-Math.PI / 2} position={[-9, 0.015, -8.8]} receiveShadow>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#e3c88f" roughness={1} />
      </mesh>
      {/* floor lamp */}
      <Block p={[-11.4, 0.9, -10.6]} s={[0.05, 1.8, 0.05]} c="#333" />
      <mesh position={[-11.4, 1.85, -10.6]}>
        <coneGeometry args={[0.32, 0.36, 24, 1, true]} />
        <meshStandardMaterial color="#fff2d1" emissive="#ffd88a" emissiveIntensity={0.7} side={2} />
      </mesh>
      <pointLight position={[-11.4, 1.7, -10.6]} intensity={6} distance={7} color="#ffcf87" />
      <Plant x={-6} z={-12.6} s={1.3} />
      <Plant x={-18.8} z={-8} />
    </group>
  );
}

function MeetingRoom() {
  const knock = useOffice(s => s.knock);
  const open = knock === 'admitted';
  const door = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!door.current) return;
    const goal = open ? ROOM_DOOR.x - ROOM_DOOR.w : ROOM_DOOR.x;
    door.current.position.x += (goal - door.current.position.x) * Math.min(1, dt * 4);
  });
  const glass = <meshPhysicalMaterial color="#cfe3f2" transparent opacity={0.28} roughness={0.05} />;
  const h = 2.4;
  const left = ROOM.x - ROOM.w / 2,
    right = ROOM.x + ROOM.w / 2,
    top = ROOM.z - ROOM.d / 2,
    bottom = ROOM.z + ROOM.d / 2;
  const dl = ROOM_DOOR.x - ROOM_DOOR.w / 2,
    dr = ROOM_DOOR.x + ROOM_DOOR.w / 2;
  return (
    <group>
      <mesh position={[ROOM.x, h / 2, top]}>
        <boxGeometry args={[ROOM.w, h, 0.08]} />
        {glass}
      </mesh>
      <mesh position={[left, h / 2, ROOM.z]}>
        <boxGeometry args={[0.08, h, ROOM.d]} />
        {glass}
      </mesh>
      <mesh position={[right, h / 2, ROOM.z]}>
        <boxGeometry args={[0.08, h, ROOM.d]} />
        {glass}
      </mesh>
      <mesh position={[(left + dl) / 2, h / 2, bottom]}>
        <boxGeometry args={[dl - left, h, 0.08]} />
        {glass}
      </mesh>
      <mesh position={[(dr + right) / 2, h / 2, bottom]}>
        <boxGeometry args={[right - dr, h, 0.08]} />
        {glass}
      </mesh>
      <mesh ref={door} position={[ROOM_DOOR.x, h / 2, bottom + 0.06]} castShadow>
        <boxGeometry args={[ROOM_DOOR.w, h, 0.06]} />
        <meshStandardMaterial color="#a9805a" roughness={0.6} />
      </mesh>
      {/* table + screen */}
      <Block p={[ROOM.x + 1, 0.74, ROOM.z - 0.4]} s={[5, 0.08, 1.8]} c="#efe6d8" />
      <Block p={[ROOM.x + 1, 0.37, ROOM.z - 0.4]} s={[0.4, 0.74, 0.4]} c="#6d6257" />
      <mesh position={[ROOM.x + 1, 1.5, top + 0.08]}>
        <planeGeometry args={[3.2, 1.6]} />
        <meshStandardMaterial color="#2a3b4c" emissive="#3a6c95" emissiveIntensity={0.5} />
      </mesh>
      {/* frame lines on the glass so walls read as walls */}
      {[left, right].map(x => (
        <Block key={x} p={[x, h + 0.04, ROOM.z]} s={[0.12, 0.08, ROOM.d]} c="#7a6a5b" />
      ))}
      <Block p={[ROOM.x, h + 0.04, top]} s={[ROOM.w, 0.08, 0.12]} c="#7a6a5b" />
      <Block p={[ROOM.x, h + 0.04, bottom]} s={[ROOM.w, 0.08, 0.12]} c="#7a6a5b" />
    </group>
  );
}

function Reception() {
  return (
    <group>
      <Block p={[0, 0.55, 9.6]} s={[4, 1.1, 1]} c="#c9a271" />
      <Block p={[0, 1.12, 9.6]} s={[4.1, 0.05, 1.1]} c="#efe6d8" />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 12.4]} receiveShadow>
        <planeGeometry args={[3, 1.6]} />
        <meshStandardMaterial color="#2f6f8f" roughness={1} />
      </mesh>
      <Plant x={-3.4} z={9.4} s={1.2} />
      <Plant x={3.4} z={9.4} s={1.2} />
    </group>
  );
}

function Shell() {
  const { w, d } = FLOOR;
  const windows = [];
  for (let x = -w / 2 + 3; x <= w / 2 - 3; x += 4) {
    windows.push(
      <mesh key={x} position={[x, 1.7, -d / 2 + 0.11]}>
        <planeGeometry args={[3, 1.8]} />
        <meshStandardMaterial color="#bfe0f5" emissive="#bfe0f5" emissiveIntensity={0.55} />
      </mesh>,
    );
  }
  return (
    <group>
      {/* back + side walls only, so the camera can see in from the south */}
      <Block p={[0, 1.6, -d / 2]} s={[w, 3.2, 0.2]} c={WALL} />
      <Block p={[-w / 2, 1.6, 0]} s={[0.2, 3.2, d]} c={WALL} />
      <Block p={[w / 2, 1.6, 0]} s={[0.2, 3.2, d]} c={WALL} />
      {windows}
      <Block p={[0, 0.06, d / 2]} s={[w, 0.12, 0.2]} c="#cbbfae" />
    </group>
  );
}

export function Floor() {
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // ignore drags (camera orbit)
    e.stopPropagation();
    walkTo(e.point.x, e.point.z);
  };
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onClick}>
        <planeGeometry args={[FLOOR.w, FLOOR.d]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      {/* outside ground */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#cfd8c4" roughness={1} />
      </mesh>
      {zones
        .filter(z => z.kind === 'team')
        .map(z => (
          <mesh key={z.id} rotation-x={-Math.PI / 2} position={[z.x, 0.012, z.z]} receiveShadow>
            <planeGeometry args={[z.w - 0.6, z.d - 0.6]} />
            <meshStandardMaterial color={z.color} roughness={1} />
          </mesh>
        ))}
      <Shell />
      {desks.map(d => (
        <DeskSet key={d.id} d={d} />
      ))}
      <DeskSet d={MY_DESK} mine />
      <Lounge />
      <MeetingRoom />
      <Reception />
      <Plant x={-6} z={4} />
      <Plant x={6} z={4} />
      <Plant x={18.5} z={4} />
      <Plant x={-18.5} z={4} />
    </group>
  );
}
