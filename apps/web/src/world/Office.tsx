import { SoftShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Hud } from '../hud/Hud';
import { Floor } from './Floor';
import { Colleagues, Player } from './People';
import { SPAWN } from '@knovra/shared';
import { useEffect } from 'react';
import { connect, disconnect } from '../realtime';
import { DEMO, useOffice } from '../state';

export function OfficeScene() {
  const orgId = useOffice(s => s.orgId);
  useEffect(() => {
    if (DEMO || !orgId) return;
    connect(orgId);
    return disconnect;
  }, [orgId]);
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [SPAWN.x + 6, 13, SPAWN.z + 12], fov: 42 }}
        aria-label="Your office floor, shown in 3D"
      >
        <color attach="background" args={['#e9eef0']} />
        <fog attach="fog" args={['#e9eef0', 40, 90]} />
        <SoftShadows size={18} samples={6} />
        <hemisphereLight args={['#fff6e8', '#b9c4b0', 0.9]} />
        <directionalLight
          position={[14, 22, 10]}
          intensity={1.6}
          color="#fff1dc"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <Floor />
        <Colleagues />
        <Player />
      </Canvas>
      <Hud />
    </>
  );
}
