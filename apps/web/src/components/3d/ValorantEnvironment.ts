import * as THREE from 'three';
import type { InteractiveNode, InnovationTowerFloor } from '@kynetra/contracts';

/**
 * ValorantEnvironment (LLD: Modular Esports Stylized 3D Base Architecture)
 *
 * Implements Valorant's signature tactical sci-fi aesthetic:
 * - Clean matte carbon and titanium white panels with sharp chamfers.
 * - Glowing Radianite neon energy conduits (Cyan #00f5d4, Red #ff4655, Amber #ffb703).
 * - Ultra-crisp lighting, soft contact shadows, and atmospheric gradient sky.
 * - Futuristic server blades, curved ultrawide esports battle pods, and crystalline AI holograms.
 */
export class ValorantEnvironment {
  // Shared High-Quality Tactical Materials
  private static materials = {
    carbonMat: new THREE.MeshStandardMaterial({
      color: 0x141824,
      roughness: 0.35,
      metalness: 0.65,
    }),
    titaniumWhiteMat: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.2,
    }),
    darkSlateMat: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.5,
    }),
    radianiteCyanGlow: new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.6,
      roughness: 0.1,
    }),
    radianiteRedGlow: new THREE.MeshStandardMaterial({
      color: 0xff4655,
      emissive: 0xff4655,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    }),
    radianiteAmberGlow: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    }),
    glassWallMat: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.4,
    }),
    wallTrimMat: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.8,
    }),
  };

  /**
   * Builds the tactical skybox, distant tech spires, and cinematic lighting
   */
  public static setupTacticalLightingAndSky(scene: THREE.Scene): {
    dirLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    alarmLights: THREE.PointLight[];
  } {
    // 1. Stylized Sky Atmosphere
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.012);

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(140, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x11192e,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Distant futuristic geometric spires (gives scale and tactical grandeur)
    const spiresGroup = new THREE.Group();
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x0e1424,
      roughness: 0.8,
    });
    const spireGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 90 + (i % 3) * 12;
      const w = 5 + (i % 4) * 3;
      const h = 35 + (i % 5) * 18;

      const spire = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), spireMat);
      spire.position.set(Math.cos(angle) * dist, h / 2 - 10, Math.sin(angle) * dist);
      spiresGroup.add(spire);

      // Neon vertical beacon line on spire
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3), spireGlowMat);
      beacon.position.set(spire.position.x, spire.position.y, spire.position.z + w / 2 + 0.1);
      spiresGroup.add(beacon);
    }
    scene.add(spiresGroup);

    // 2. Cinematic Tactical Directional Sun Light
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    dirLight.position.set(32, 50, 24);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 130;
    dirLight.shadow.camera.left = -45;
    dirLight.shadow.camera.right = 45;
    dirLight.shadow.camera.top = 45;
    dirLight.shadow.camera.bottom = -45;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);

    // 3. Crisp Hemisphere Ambient Fill (Sky cool, ground warm)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.95);
    scene.add(hemiLight);

    // 4. Tactical Point Lights / Emergency Alarms
    const alarmLights: THREE.PointLight[] = [];
    const alarmPositions: [number, number, number][] = [
      [-8, 4.5, 2],
      [8, 4.5, 2],
      [-8, 4.5, -6],
      [8, 4.5, -6],
      [0, 4.5, 7],
    ];

    alarmPositions.forEach(([x, y, z]) => {
      const pLight = new THREE.PointLight(0x00f5d4, 1.4, 26);
      pLight.position.set(x, y, z);
      scene.add(pLight);
      alarmLights.push(pLight);
    });

    return { dirLight, hemiLight, alarmLights };
  }

  /**
   * Constructs the complete high-speed Valorant-grade interior base
   */
  public static buildTacticalWorkspace(
    roomSize = 36
  ): {
    group: THREE.Group;
    ariaHologram: THREE.Group;
    serverBlades: THREE.Mesh[];
  } {
    const group = new THREE.Group();
    const serverBlades: THREE.Mesh[] = [];

    // 1. Modular Carbon Floor with Glowing Radianite Conduits
    const floorTileSize = 4;
    const tilesCount = Math.floor(roomSize / floorTileSize);

    for (let ix = -tilesCount / 2; ix < tilesCount / 2; ix++) {
      for (let iz = -tilesCount / 2; iz < tilesCount / 2; iz++) {
        const isCenter = Math.abs(ix) <= 1 && Math.abs(iz) <= 1;
        const tileGeo = new THREE.BoxGeometry(floorTileSize - 0.08, 0.2, floorTileSize - 0.08);
        const tileMat = isCenter
          ? this.materials.carbonMat
          : (ix + iz) % 2 === 0
          ? this.materials.carbonMat
          : this.materials.darkSlateMat;

        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(ix * floorTileSize + floorTileSize / 2, -0.1, iz * floorTileSize + floorTileSize / 2);
        tile.receiveShadow = true;
        group.add(tile);
      }
    }

    // Glowing Radianite Crosshair / Conduit Grid in Floor
    const conduitGeoX = new THREE.PlaneGeometry(roomSize - 2, 0.08);
    const conduitGeoZ = new THREE.PlaneGeometry(0.08, roomSize - 2);

    [-8, 0, 8].forEach((offset) => {
      const conduitX = new THREE.Mesh(conduitGeoX, this.materials.radianiteCyanGlow);
      conduitX.rotation.x = -Math.PI / 2;
      conduitX.position.set(0, 0.02, offset);
      group.add(conduitX);

      const conduitZ = new THREE.Mesh(conduitGeoZ, this.materials.radianiteCyanGlow);
      conduitZ.rotation.x = -Math.PI / 2;
      conduitZ.position.set(offset, 0.02, 0);
      group.add(conduitZ);
    });

    // 2. Perimeter Glass Walls & Tactical Titanium Frame
    const wallHeight = 5.2;

    // West Wall
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, wallHeight, roomSize),
      this.materials.glassWallMat
    );
    westWall.position.set(-roomSize / 2, wallHeight / 2, 0);
    group.add(westWall);

    // East Wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, wallHeight, roomSize),
      this.materials.glassWallMat
    );
    eastWall.position.set(roomSize / 2, wallHeight / 2, 0);
    group.add(eastWall);

    // North Wall (Panoramic Vista Wall)
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize, wallHeight, 0.2),
      this.materials.glassWallMat
    );
    northWall.position.set(0, wallHeight / 2, -roomSize / 2);
    group.add(northWall);

    // South Entrance Wall (Divided into Left and Right sections, doorway at x: [-2.5, 2.5])
    const southWallL = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, wallHeight, 0.2),
      this.materials.glassWallMat
    );
    southWallL.position.set(-10.25, wallHeight / 2, 14);
    group.add(southWallL);

    const southWallR = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, wallHeight, 0.2),
      this.materials.glassWallMat
    );
    southWallR.position.set(10.25, wallHeight / 2, 14);
    group.add(southWallR);

    // Tactical Doorway Frame
    const doorHeader = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 1.2, 0.3),
      this.materials.wallTrimMat
    );
    doorHeader.position.set(0, wallHeight - 0.6, 14);
    group.add(doorHeader);

    // Glowing Cyan Trim on Doorway
    const doorNeon = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.06, 0.32),
      this.materials.radianiteCyanGlow
    );
    doorNeon.position.set(0, wallHeight - 1.2, 14);
    group.add(doorNeon);

    // 3. Central Spawn / Teleport Jump Pad (Center at x: 0, z: 4)
    const jumpPadGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.12, 6);
    const jumpPad = new THREE.Mesh(jumpPadGeo, this.materials.carbonMat);
    jumpPad.position.set(0, 0.06, 4);
    jumpPad.receiveShadow = true;
    group.add(jumpPad);

    const jumpPadRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.0, 6),
      this.materials.radianiteCyanGlow
    );
    jumpPadRing.rotation.x = -Math.PI / 2;
    jumpPadRing.position.set(0, 0.13, 4);
    group.add(jumpPadRing);

    // 4. Algorithmic Coding Arena (Floor 4 Feature: Hexagonal Podium with Battle Pods)
    const arenaPodium = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.8, 0.25, 6),
      this.materials.carbonMat
    );
    arenaPodium.position.set(-8, 0.12, -5);
    arenaPodium.receiveShadow = true;
    group.add(arenaPodium);

    const arenaGlowRing = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 5.45, 6),
      this.materials.radianiteCyanGlow
    );
    arenaGlowRing.rotation.x = -Math.PI / 2;
    arenaGlowRing.position.set(-8, 0.26, -5);
    group.add(arenaGlowRing);

    // Battle Pod Alpha & Beta (Sleek Esports Workstations)
    const createBattlePod = (x: number, z: number, rotY: number) => {
      const podGroup = new THREE.Group();
      podGroup.position.set(x, 0, z);
      podGroup.rotation.y = rotY;

      // Curved Titanium Console Desk
      const deskGeo = new THREE.BoxGeometry(2.4, 0.12, 1.2);
      const desk = new THREE.Mesh(deskGeo, this.materials.carbonMat);
      desk.position.y = 0.95;
      desk.castShadow = true;
      podGroup.add(desk);

      // Curved Ultrawide Display
      const monitorGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.75, 16, 1, true, -Math.PI / 4, Math.PI / 2);
      const monitorMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        side: THREE.DoubleSide,
      });
      const monitor = new THREE.Mesh(monitorGeo, monitorMat);
      monitor.position.set(0, 1.5, -0.6);
      podGroup.add(monitor);

      // Keyboard & Glow
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.25), this.materials.darkSlateMat);
      kb.position.set(0, 1.02, 0.2);
      podGroup.add(kb);

      const kbGlow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.01, 0.04), this.materials.radianiteCyanGlow);
      kbGlow.position.set(0, 1.03, 0.32);
      podGroup.add(kbGlow);

      group.add(podGroup);
    };

    createBattlePod(-9.5, -4.5, 0.3);
    createBattlePod(-6.5, -5.5, -0.3);

    // 5. Cloud Infrastructure & SRE Lab (Floor 8 Feature: Server Monoliths with LEDs)
    const srePodium = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 5),
      this.materials.carbonMat
    );
    srePodium.position.set(8, 0.1, -5);
    srePodium.receiveShadow = true;
    group.add(srePodium);

    const sreGlow = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.04, 0.1),
      this.materials.radianiteRedGlow
    );
    sreGlow.position.set(8, 0.22, -2.55);
    group.add(sreGlow);

    // 3 Server Blades Monoliths
    for (let s = -2; s <= 2; s += 2) {
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.2, 1.0),
        this.materials.darkSlateMat
      );
      rack.position.set(8 + s, 1.7, -6);
      rack.castShadow = true;
      group.add(rack);

      // Cascading LED blade rows
      const ledBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.6, 0.05),
        this.materials.radianiteCyanGlow
      );
      ledBar.position.set(8 + s, 1.7, -5.48);
      group.add(ledBar);
      serverBlades.push(ledBar);
    }

    // 6. Aria AI Receptionist Hologram Node (Floating Crystalline Core + Orbital Rings)
    const ariaHologram = new THREE.Group();
    ariaHologram.name = 'aria_hologram';
    ariaHologram.position.set(0, 1.8, -1);

    // Hologram Pedestal
    const ariaPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.35, 6),
      this.materials.carbonMat
    );
    ariaPedestal.position.set(0, 0.18, -1);
    group.add(ariaPedestal);

    const ariaPedestalRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.1, 6),
      this.materials.radianiteCyanGlow
    );
    ariaPedestalRing.rotation.x = -Math.PI / 2;
    ariaPedestalRing.position.set(0, 0.36, -1);
    group.add(ariaPedestalRing);

    // Floating Crystal Octahedron Core
    const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    ariaHologram.add(crystal);

    // Dual Counter-Rotating Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(0.75, 0.025, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.name = 'aria_ring_1';
    ring1.rotation.x = Math.PI / 3;
    ariaHologram.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(0.95, 0.02, 8, 32);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.name = 'aria_ring_2';
    ring2.rotation.y = Math.PI / 4;
    ariaHologram.add(ring2);

    group.add(ariaHologram);

    // 7. Executive Admin Command Dais (Zone: Executive Admin Suite at x: 7, z: 8)
    const adminDais = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.25, 6),
      this.materials.carbonMat
    );
    adminDais.position.set(7, 0.12, 8);
    adminDais.receiveShadow = true;
    group.add(adminDais);

    const adminGlowRim = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.05, 0.1),
      this.materials.radianiteAmberGlow
    );
    adminGlowRim.position.set(7, 0.26, 5.05);
    group.add(adminGlowRim);

    // Master Curved Command Console
    const adminConsole = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.12, 1.2),
      this.materials.carbonMat
    );
    adminConsole.position.set(7, 0.95, 8.5);
    adminConsole.castShadow = true;
    group.add(adminConsole);

    const adminScreen = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.85, 20, 1, true, -Math.PI / 4, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
    );
    adminScreen.position.set(7, 1.55, 7.8);
    group.add(adminScreen);

    return { group, ariaHologram, serverBlades };
  }

  /**
   * Minimalist, Crisp Valorant-Style Holographic Station Waypoint
   */
  public static createTacticalWaypointMarker(
    title: string,
    icon: string,
    type: string
  ): THREE.Group {
    const markerGroup = new THREE.Group();
    markerGroup.name = `waypoint_${title}`;

    // Floating Holographic Diamond
    const diamondGeo = new THREE.OctahedronGeometry(0.24, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: type === 'emergency' ? 0xff4655 : 0x00f5d4,
      wireframe: true,
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 2.4;
    markerGroup.add(diamond);

    // Inner Glowing Core
    const coreGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: type === 'emergency' ? 0xff4655 : 0x38bdf8,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    markerGroup.add(core);

    // Sleek Minimalist Tactical Tag Sprite
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(11, 15, 25, 0.88)';
        ctx.fillRect(8, 8, 240, 48);

        ctx.strokeStyle = type === 'emergency' ? '#ff4655' : '#00f5d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 240, 48);

        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${icon} ${title}`, 128, 38);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.y = 2.9;
      sprite.scale.set(1.8, 0.45, 1);
      markerGroup.add(sprite);
    }

    return markerGroup;
  }
}
