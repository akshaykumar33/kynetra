import * as THREE from 'three';
import type { InteractiveNode } from '@kynetra/contracts';
import type { WorldCollider } from './WorldColliders';
import { TacticalCollisionEngine } from './TacticalCollisionEngine';

/**
 * AvatarController — High-Speed Articulated Minecraft Voxel Character
 *
 * Features:
 * 1. Classic Minecraft Steve/Student Voxel Character with 3D hair layer, limbs, and eyes.
 * 2. Frictionless continuous collision resolution (swept-sphere + surface tangent velocity projection).
 * 3. Camera-relative WASD & Arrow navigation with instant response and no stuck corners.
 * 4. High-speed sprint mode (Shift: 19.0 m/s) with dynamic turning banking and walking cadence.
 * 5. Low-overhead execution (optimized memory and garbage collection).
 */
export class AvatarController {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private keys: Record<string, boolean> = {};

  // High-performance locomotion parameters
  private readonly walkSpeed = 12.0;
  private readonly sprintSpeed = 19.0;
  private walkTime = 0;
  private nearbyNodeId: string | null = null;

  // Visual sub-groups
  private bobbingMesh: THREE.Group;
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private headMesh!: THREE.Mesh;
  private nameSprite: THREE.Sprite | null = null;

  // Camera Orbit & Zoom State - Default to 45° Isometric Perspective
  public orbitAngle = Math.PI / 4; // 45-degree isometric diagonal
  public orbitPitch = 0.62; // 35.5-degree isometric elevation pitch
  public zoomDistance = 28.0; // Overview distance
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;

  constructor(initialX = 0, initialZ = 4) {
    this.mesh = new THREE.Group();
    this.position = this.mesh.position;
    this.position.set(initialX, 0, initialZ);

    this.bobbingMesh = new THREE.Group();
    this.mesh.add(this.bobbingMesh);

    this.createMinecraftVoxelAvatar();
    this.setupKeyboardListeners();
    this.setupMouseListeners();
  }

  /**
   * Builds the articulated Minecraft Steve / Student voxel character model.
   */
  private createMinecraftVoxelAvatar() {
    // Rich Minecraft PBR materials (warm tones, subtle specular response)
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe5a88c,
      roughness: 0.75,
      metalness: 0.05,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x422817,
      roughness: 0.85,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant cyan/teal Minecraft shirt
      roughness: 0.65,
      metalness: 0.08,
    });
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Classic rich blue jeans
      roughness: 0.75,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark gray sneakers
      roughness: 0.85,
    });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });

    // 1. Torso (0.6w, 0.9h, 0.36d)
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.9, 0.36);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bobbingMesh.add(torso);

    // Belt / shirt hem accent
    const beltGeo = new THREE.BoxGeometry(0.61, 0.12, 0.37);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.7;
    this.bobbingMesh.add(belt);

    // 2. Head (0.58 x 0.58 x 0.58)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.85, 0);

    const headGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);
    this.headMesh = head;

    // Hair cap / 3D helmet layer
    const hairCapGeo = new THREE.BoxGeometry(0.62, 0.28, 0.62);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 0.18, 0);
    headGroup.add(hairCap);

    // Hair fringe front
    const fringeGeo = new THREE.BoxGeometry(0.62, 0.12, 0.15);
    const fringe = new THREE.Mesh(fringeGeo, hairMat);
    fringe.position.set(0, 0.12, 0.25);
    headGroup.add(fringe);

    // Pixelated blocky eyes
    [[-0.14, 0.04], [0.14, 0.04]].forEach(([ex, ey]) => {
      const eyeWhite = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.06), eyeWhiteMat);
      eyeWhite.position.set(ex, ey, 0.3);
      headGroup.add(eyeWhite);

      const eyePupil = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.06), eyePupilMat);
      eyePupil.position.set(ex + (ex > 0 ? -0.02 : 0.02), ey, 0.301);
      headGroup.add(eyePupil);
    });

    this.bobbingMesh.add(headGroup);

    // 3. Left Arm Pivot & Arm (0.24w, 0.85h, 0.26d)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.44, 1.5, 0);

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

    // 5. Left Leg Pivot & Leg
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

    // 7. Ground Shadow (Minecraft square shadow)
    const shadowGeo = new THREE.PlaneGeometry(0.95, 0.95);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    // 8. Floating Role Nametag
    this.setRole('admin', 'Admin');
  }

  public setRole(role: 'admin' | 'architect' | 'employee' = 'admin', displayName = 'Admin') {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(6, 8, 308, 54);

    const roleBorderColor = role === 'admin' ? '#f59e0b' : role === 'architect' ? '#38bdf8' : '#22c55e';
    ctx.strokeStyle = roleBorderColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6, 8, 308, 54);

    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';

    const label = `${displayName} (${role.toUpperCase()})`;
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
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      return;
    }
    this.keys[e.code] = true;
    if (e.key) this.keys[e.key.toLowerCase()] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
    if (e.key) this.keys[e.key.toLowerCase()] = false;
  };

  private handleBlur = () => {
    this.keys = {};
  };

  private setupKeyboardListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
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

      this.orbitAngle -= deltaX * 0.006;
      this.orbitPitch = Math.max(0.15, Math.min(1.2, this.orbitPitch + deltaY * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener(
      'wheel',
      (e) => {
        if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
          this.zoomDistance = Math.max(10.0, Math.min(48.0, this.zoomDistance + e.deltaY * 0.02));
        }
      },
      { passive: true }
    );
  }

  /**
   * Main game loop update.
   * Runs camera-relative locomotion, continuous collision resolution, and articulated animations.
   */
  public update(
    delta: number,
    nodes: InteractiveNode[] = [],
    bounds = 65.0,
    colliders: WorldCollider[] = []
  ): {
    isMoving: boolean;
    nearbyNode: InteractiveNode | null;
  } {
    // 1. Precise WASD and Arrow Key Inputs
    const isW = !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w']);
    const isS = !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s']);
    const isA = !!(this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a']);
    const isD = !!(this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d']);
    const isSprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);

    // 2. Camera-Relative Ground Projection Vectors (XZ)
    const forwardX = -Math.sin(this.orbitAngle);
    const forwardZ = -Math.cos(this.orbitAngle);
    const rightX = Math.cos(this.orbitAngle);
    const rightZ = -Math.sin(this.orbitAngle);

    let dirX = 0;
    let dirZ = 0;

    if (isW) {
      dirX += forwardX;
      dirZ += forwardZ;
    }
    if (isS) {
      dirX -= forwardX;
      dirZ -= forwardZ;
    }
    if (isD) {
      dirX += rightX;
      dirZ += rightZ;
    }
    if (isA) {
      dirX -= rightX;
      dirZ -= rightZ;
    }

    const len = Math.hypot(dirX, dirZ);
    const isMoving = len > 0.001;
    const targetSpeed = isSprint ? this.sprintSpeed : this.walkSpeed;

    if (isMoving) {
      const nx = dirX / len;
      const nz = dirZ / len;

      // Ultra-responsive acceleration
      const targetVelX = nx * targetSpeed;
      const targetVelZ = nz * targetSpeed;
      const accel = Math.min(1, delta * 24);
      this.velocity.x += (targetVelX - this.velocity.x) * accel;
      this.velocity.z += (targetVelZ - this.velocity.z) * accel;

      // Smooth shortest-arc rotation towards movement heading
      const targetAngle = Math.atan2(nx, nz);
      let diff = targetAngle - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, delta * 18);

      // Dynamic banking/lean into turns
      const turnRoll = -diff * 0.15;
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, turnRoll, delta * 12);

      // Minecraft walking limb animation (cadence scales with walk / sprint)
      const animCadence = isSprint ? 17 : 11;
      this.walkTime += delta * animCadence;
      const swing = Math.sin(this.walkTime) * (isSprint ? 0.9 : 0.7);

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
      // Snappy deceleration
      const friction = Math.min(1, delta * 24);
      this.velocity.x += (0 - this.velocity.x) * friction;
      this.velocity.z += (0 - this.velocity.z) * friction;
      if (Math.abs(this.velocity.x) < 0.005) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.005) this.velocity.z = 0;

      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, delta * 14);

      // Smoothly return limbs to neutral idle pose
      if (this.leftArmPivot && this.rightArmPivot) {
        this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, delta * 14);
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, delta * 14);
      }

      if (this.leftLegPivot && this.rightLegPivot) {
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, delta * 14);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, delta * 14);
      }

      this.bobbingMesh.position.y = THREE.MathUtils.lerp(this.bobbingMesh.position.y, 0, delta * 12);
    }

    // 3. Continuous Swept-Sphere Physical Collision Resolution & Frictionless Sliding
    const moveStepX = this.velocity.x * delta;
    const moveStepZ = this.velocity.z * delta;

    if (Math.abs(moveStepX) > 0.0001 || Math.abs(moveStepZ) > 0.0001) {
      const resolved = TacticalCollisionEngine.resolve(
        this.position.x,
        this.position.z,
        this.velocity.x,
        this.velocity.z,
        colliders
      );
      this.position.x = resolved.x;
      this.position.z = resolved.z;
      this.velocity.x = resolved.vx;
      this.velocity.z = resolved.vz;
    }

    // Boundary constraints (Stay inside room / estate bounds)
    this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
    this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

    // Proximity check against interactive nodes
    let closestNode: InteractiveNode | null = null;
    let minDistance = 3.2;

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

  public teleport(x: number, z: number) {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
  }

  public showEmote(emoji: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.arc(64, 64, 56, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      ctx.font = '64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 64, 68);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const emoteSprite = new THREE.Sprite(spriteMat);
    emoteSprite.position.set(0, 3.4, 0);
    emoteSprite.scale.set(1.4, 1.4, 1);
    this.mesh.add(emoteSprite);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 2.5) {
        this.mesh.remove(emoteSprite);
        spriteMat.dispose();
        texture.dispose();
      } else {
        emoteSprite.position.y = 3.4 + elapsed * 0.4;
        spriteMat.opacity = Math.max(0, 1 - elapsed / 2.5);
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  public dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
  }
}
