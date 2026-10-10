import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { Status } from '@knovra/shared';

const STATUS_COLOR: Record<Status, string> = {
  available: '#3fb67d',
  meeting: '#e0a23a',
  focus: '#7c6bd6',
  away: '#a3a3a3',
};

interface Props {
  name: string;
  body: string;
  skin: string;
  hair: string;
  status: Status;
  remote?: boolean;
  /** 0..1 how fast the avatar is moving; drives the walk bob. */
  speedRef: { current: number };
  talking?: boolean;
  /** Saying something right now: the ring pulses. */
  speaking?: boolean;
  isMe?: boolean;
}

// Stylised figure: rounded body, big head, stubby feet. Built from primitives so
// it stays light on phones and needs no model files.
export function Avatar({ name, body, skin, hair, status, remote, speedRef, talking, speaking, isMe }: Props) {
  const rig = useRef<Group>(null);
  const footL = useRef<Group>(null);
  const footR = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const phase = useRef(Math.random() * 10);

  useFrame((_, dt) => {
    const s = speedRef.current;
    phase.current += dt * (s > 0.05 ? 11 : 1.6);
    const t = phase.current;
    if (rig.current) {
      rig.current.position.y = s > 0.05 ? Math.abs(Math.sin(t)) * 0.09 : Math.sin(t) * 0.015;
      rig.current.rotation.z = s > 0.05 ? Math.sin(t) * 0.05 : 0;
    }
    if (footL.current && footR.current) {
      footL.current.position.z = s > 0.05 ? Math.sin(t) * 0.14 : 0;
      footR.current.position.z = s > 0.05 ? -Math.sin(t) * 0.14 : 0;
    }
    if (ring.current) {
      const k = speaking ? 1.12 + Math.sin(t * 9) * 0.1 : talking ? 1 + Math.sin(t * 3) * 0.04 : 1;
      ring.current.scale.setScalar(k);
    }
  });

  return (
    <group>
      <group ref={ring} position={[0, 0.02, 0]}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial
            color={talking ? '#3fb67d' : isMe ? '#2f6f8f' : '#000000'}
            transparent
            opacity={talking || isMe ? 0.75 : 0.08}
          />
        </mesh>
      </group>
      <group ref={rig}>
        {/* body */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.27, 0.36, 6, 16]} />
          <meshStandardMaterial color={body} roughness={0.7} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.18, 0]} castShadow>
          <sphereGeometry args={[0.3, 24, 18]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 1.25, -0.03]} scale={[1.04, 0.82, 1.04]}>
          <sphereGeometry args={[0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* eyes face +z */}
        {[-0.1, 0.1].map(x => (
          <mesh key={x} position={[x, 1.2, 0.27]}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshBasicMaterial color="#1d1d1d" />
          </mesh>
        ))}
      </group>
      {[footL, footR].map((r, i) => (
        <group key={i} ref={r}>
          <mesh position={[i ? 0.12 : -0.12, 0.07, 0.04]}>
            <sphereGeometry args={[0.1, 12, 8]} />
            <meshStandardMaterial color="#3b3b3b" />
          </mesh>
        </group>
      ))}
      <Html position={[0, 1.75, 0]} center distanceFactor={18} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`nametag${isMe ? ' me' : ''}`}>
          <i style={{ background: STATUS_COLOR[status] }} />
          {name}
          {remote && <span className="where">home</span>}
        </div>
      </Html>
    </group>
  );
}

export { STATUS_COLOR };
