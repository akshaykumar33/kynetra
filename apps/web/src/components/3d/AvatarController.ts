import * as THREE from 'three';
import type { InteractiveNode } from '@kynetra/contracts';

export class AvatarController {
  public mesh: THREE.Group;
  private keys: Record<string, boolean> = {};
  public position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private speed = 7.5; // units per second
  private walkTime = 0;
  private bobbingMesh: THREE.Group;
  private nearbyNodeId: string | null = null;

  // Limb pivots for Minecraft-style articulated walking animation
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private headMesh!: THREE.Mesh;
  private nameSprite: THREE.Sprite | null = null;

  // Camera Orbit & Zoom State
  public orbitAngle = 0; // Horizontal orbit around avatar in radians
  public orbitPitch = 0.42; // Vertical pitch
  public zoomDistance = 9.5; // Distance from avatar
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;

  constructor() {
    this.mesh = new THREE.Group();
    this.position = this.mesh.position;
    this.position.set(0, 0, 4);

    this.bobbingMesh = new THREE.Group();
    this.mesh.add(this.bobbingMesh);

    this.createMinecraftVoxelAvatar();
    this.setupKeyboardListeners();
    this.setupMouseListeners();
  }

  private createMinecraftVoxelAvatar() {
    // Colors inspired by Minecraft player skin (Steve/Alex student skin)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0a98b, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 }); // Cyan/Blue shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 }); // Navy jeans
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 }); // Dark sneakers
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });

    // 1. Torso (8 wide, 12 tall, 4 deep in voxel units -> 0.6w, 0.9h, 0.35d)
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.9, 0.35);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bobbingMesh.add(torso);

    // Belt / shirt hem accent
    const beltGeo = new THREE.BoxGeometry(0.61, 0.12, 0.36);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.7;
    this.bobbingMesh.add(belt);

    // 2. Head (8x8x8 voxel cube -> 0.6 x 0.6 x 0.6)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.85, 0);

    const headGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);
    this.headMesh = head;

    // Hair cap / layer (Minecraft helmet layer)
    const hairCapGeo = new THREE.BoxGeometry(0.62, 0.28, 0.62);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 0.18, 0);
    headGroup.add(hairCap);

    // Hair fringe front
    const fringeGeo = new THREE.BoxGeometry(0.62, 0.12, 0.15);
    const fringe = new THREE.Mesh(fringeGeo, hairMat);
    fringe.position.set(0, 0.12, 0.25);
    headGroup.add(fringe);

    // Eyes (Minecraft blocky eyes)
    [[-0.14, 0.04], [0.14, 0.04]].forEach(([ex, ey]) => {
      const eyeWhite = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.06), eyeWhiteMat);
      eyeWhite.position.set(ex, ey, 0.3);
      headGroup.add(eyeWhite);

      const eyePupil = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.06), eyePupilMat);
      eyePupil.position.set(ex + (ex > 0 ? -0.02 : 0.02), ey, 0.301);
      headGroup.add(eyePupil);
    });

    this.bobbingMesh.add(headGroup);

    // 3. Left Arm Pivot & Arm (4x12x4 voxels -> 0.24w, 0.85h, 0.26d)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.44, 1.5, 0);

    const armGeo = new THREE.BoxGeometry(0.24, 0.85, 0.26);
    // Sleeve top half, skin bottom half
    const leftArmSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.27), shirtMat);
    leftArmSleeve.position.set(0, -0.275, 0);
    leftArmSleeve.castShadow = true;
    this.leftArmPivot.add(leftArmSleeve);

    const leftArmHand = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.3, 0.25), skinMat);
    leftArmHand.position.set(0, -0.7, 0);
    leftArmHand.castShadow = true;
    this.leftArmPivot.add(leftArmHand);

    this.bobbingMesh.add(this.leftArmPivot);

    // 4. Right Arm Pivot & Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.44, 1.5, 0);

    const rightArmSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.27), shirtMat);
    rightArmSleeve.position.set(0, -0.275, 0);
    rightArmSleeve.castShadow = true;
    this.rightArmPivot.add(rightArmSleeve);

    const rightArmHand = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.3, 0.25), skinMat);
    rightArmHand.position.set(0, -0.7, 0);
    rightArmHand.castShadow = true;
    this.rightArmPivot.add(rightArmHand);

    this.bobbingMesh.add(this.rightArmPivot);

    // 5. Left Leg Pivot & Leg (4x12x4 voxels -> 0.26w, 0.7h, 0.28d)
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.7, 0);

    const leftPants = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.28), pantsMat);
    leftPants.position.set(0, -0.26, 0);
    leftPants.castShadow = true;
    this.leftLegPivot.add(leftPants);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.18, 0.32), shoeMat);
    leftShoe.position.set(0, -0.61, 0.02);
    leftShoe.castShadow = true;
    this.leftLegPivot.add(leftShoe);

    this.bobbingMesh.add(this.leftLegPivot);

    // 6. Right Leg Pivot & Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.7, 0);

    const rightPants = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.28), pantsMat);
    rightPants.position.set(0, -0.26, 0);
    rightPants.castShadow = true;
    this.rightLegPivot.add(rightPants);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.18, 0.32), shoeMat);
    rightShoe.position.set(0, -0.61, 0.02);
    rightShoe.castShadow = true;
    this.rightLegPivot.add(rightShoe);

    this.bobbingMesh.add(this.rightLegPivot);

    // 7. Floating Minecraft Nametag (role-aware)
    this.setRole('employee');
  }

  public setRole(role: 'admin' | 'architect' | 'employee' = 'employee') {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(6, 8, 308, 54);

    const roleBorderColor = role === 'admin' ? '#f59e0b' : role === 'architect' ? '#38bdf8' : '#22c55e';
    ctx.strokeStyle = roleBorderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 8, 308, 54);

    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';

    const label = `YOU (${role.toUpperCase()})`;
    ctx.fillStyle = '#111111';
    ctx.fillText(label, 162, 44);

    ctx.fillStyle = role === 'admin' ? '#fbbf24' : role === 'architect' ? '#7dd3fc' : '#ffffff';
    ctx.fillText(label, 160, 42);

    const texture = new THREE.CanvasTexture(canvas);
    if (this.nameSprite) {
      this.nameSprite.material.map?.dispose();
      this.nameSprite.material.map = texture;
      this.nameSprite.material.needsUpdate = true;
    } else {
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      this.nameSprite = new THREE.Sprite(spriteMat);
      this.nameSprite.position.set(0, 2.5, 0);
      this.nameSprite.scale.set(1.7, 0.38, 1);
      this.bobbingMesh.add(this.nameSprite);
    }

    // 8. Ground Shadow (Voxel square shadow)
    const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);
  }

  private setupKeyboardListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  private setupMouseListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
        this.isDragging = true;
        this.previousMouseX = e.clientX;
        this.previousMouseY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;

      // Orbit horizontal and pitch vertical
      this.orbitAngle -= deltaX * 0.006;
      this.orbitPitch = Math.max(0.15, Math.min(1.2, this.orbitPitch + deltaY * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('wheel', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
        this.zoomDistance = Math.max(4.0, Math.min(22.0, this.zoomDistance + e.deltaY * 0.015));
      }
    }, { passive: true });
  }

  public update(delta: number, nodes: InteractiveNode[] = [], bounds = 16.0): {
    isMoving: boolean;
    nearbyNode: InteractiveNode | null;
  } {
    const moveZ = (this.keys['KeyW'] || this.keys['ArrowUp'] ? -1 : 0) +
                  (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const moveX = (this.keys['KeyA'] || this.keys['ArrowLeft'] ? -1 : 0) +
                  (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0);

    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      // Move relative to camera orbit angle
      const forward = new THREE.Vector3(Math.sin(this.orbitAngle), 0, Math.cos(this.orbitAngle)).normalize();
      const right = new THREE.Vector3(Math.cos(this.orbitAngle), 0, -Math.sin(this.orbitAngle)).normalize();

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      this.velocity.copy(moveDir).multiplyScalar(this.speed * delta);
      this.position.add(this.velocity);

      // Rotate avatar towards movement heading
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = targetAngle;

      // Minecraft walking limb animation (arms & legs swing alternately)
      this.walkTime += delta * 11;
      const swing = Math.sin(this.walkTime) * 0.75;

      if (this.leftArmPivot && this.rightArmPivot) {
        this.leftArmPivot.rotation.x = swing;
        this.rightArmPivot.rotation.x = -swing;
      }

      if (this.leftLegPivot && this.rightLegPivot) {
        this.leftLegPivot.rotation.x = -swing;
        this.rightLegPivot.rotation.x = swing;
      }

      // Gentle vertical bobbing
      this.bobbingMesh.position.y = Math.abs(Math.sin(this.walkTime * 2)) * 0.05;
    } else {
      // Return limbs to idle pose smoothly
      if (this.leftArmPivot && this.rightArmPivot) {
        this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, delta * 12);
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, delta * 12);
      }

      if (this.leftLegPivot && this.rightLegPivot) {
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, delta * 12);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, delta * 12);
      }

      this.bobbingMesh.position.y = THREE.MathUtils.lerp(this.bobbingMesh.position.y, 0, delta * 10);
    }

    // Boundary constraints (Stay inside office walls)
    this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
    this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

    // Proximity check against stations
    let closestNode: InteractiveNode | null = null;
    let minDistance = 3.2; // Interaction radius in meters

    for (const node of nodes) {
      const nodePos = new THREE.Vector3(node.position.x, 0, node.position.z);
      const dist = this.position.distanceTo(nodePos);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    }

    this.nearbyNodeId = closestNode ? closestNode.id : null;

    return {
      isMoving,
      nearbyNode: closestNode,
    };
  }

  public getNearbyNodeId(): string | null {
    return this.nearbyNodeId;
  }

  public setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
  }

  public dispose() {
    // Window listeners are global
  }
}
