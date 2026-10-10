import { ContactShadows, SoftShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Hud } from './hud/Hud';
import { Floor } from './world/Floor';
import { Colleagues, Player } from './world/People';
import { SPAWN } from './world/layout';

export function App() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [SPAWN.x + 6, 13, SPAWN.z + 12], fov: 42 }}
        aria-label="Floor 4 of Northgate Hub, shown in 3D"
      >
        <color attach="background" args={['#e9eef0']} />
        <fog attach="fog" args={['#e9eef0', 40, 90]} />
        <SoftShadows size={18} samples={10} />
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
        <ContactShadows position={[0, 0.01, 0]} scale={44} opacity={0.25} blur={2.4} far={3} />
      </Canvas>
      <Hud />
    </>
  );
}
