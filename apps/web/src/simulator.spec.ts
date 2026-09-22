import { describe, it, expect } from 'vitest';
import { AvatarController } from './components/3d/AvatarController';
import { sounds } from './components/hud/SoundEffects';
import type { InteractiveNode } from '@kynetra/contracts';

describe('3D Simulator Avatar Controller & Audio Engine', () => {
  it('should initialize avatar at default position', () => {
    const avatar = new AvatarController();
    expect(avatar.position.x).toBe(0);
    expect(avatar.position.y).toBe(0);
    expect(avatar.position.z).toBe(4);
  });

  it('should detect nearby interactive nodes within proximity radius', () => {
    const avatar = new AvatarController();
    avatar.setPosition(0, 0, 0);

    const nodes: InteractiveNode[] = [
      {
        id: 'node-test-1',
        name: 'Workstation Alpha',
        type: 'terminal',
        position: { x: 1, y: 1, z: 1 },
        description: 'Test workstation',
        activeSessionCount: 0,
      },
      {
        id: 'node-test-2',
        name: 'Distant Server Rack',
        type: 'cloud_lab_rack',
        position: { x: 20, y: 1, z: 20 },
        description: 'Out of range rack',
        activeSessionCount: 0,
      },
    ];

    const result = avatar.update(0.016, nodes);
    expect(result.nearbyNode).toBeDefined();
    expect(result.nearbyNode?.id).toBe('node-test-1');
  });

  it('should enforce boundary constraints within office walls', () => {
    const avatar = new AvatarController();
    avatar.setPosition(50, 0, 50); // Far out of bounds

    avatar.update(0.016, [], 13.5);
    expect(avatar.position.x).toBeLessThanOrEqual(13.5);
    expect(avatar.position.z).toBeLessThanOrEqual(13.5);
  });

  it('sound manager should be enabled by default and toggleable', () => {
    expect(sounds.enabled).toBe(true);
    sounds.enabled = false;
    expect(sounds.enabled).toBe(false);
    sounds.enabled = true;
  });
});
