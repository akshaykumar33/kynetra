import * as THREE from 'three';
import type { InteractiveNode } from '@kynetra/contracts';
import { TacticalCollisionEngine, type WorldCollider } from './TacticalCollisionEngine';

/**
 * AvatarController (LLD: Valorant-Grade Tactical Agent Controller)
 *
 * Implements:
 * 1. Precision Camera-Relative WASD & Arrow Key Locomotion (Zero input lag).
 * 2. High-Speed Tactical Dash (Shift sprint) with Radianite dash particles.
 * 3. Procedural Agent Kinematics: banking into turns, forward sprint lean, and articulated stride.
 * 4. Continuous Swept-Sphere Collision Physics with frictionless wall sliding.
 * 5. High-Fidelity Tactical Agent Model (Matte carbon vest, Radianite energy core, cyber-visor).
 */
export class AvatarController {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private keys: Record<string, boolean> = {};

  // Locomotion Tuning
  private walkSpeed = 11.5; // Fast, responsive base speed
  private sprintSpeed = 18.0; // High-speed tactical dash
  private walkTime = 0;
  private currentHeading = 0;

  // Agent Mesh Groups & Pivots
  private agentBodyGroup: THREE.Group;
  private headGroup!: THREE.Group;
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private radianiteCore!: THREE.Mesh;
  private nameSprite: THREE.Sprite | null = null;
  private shadowMesh!: THREE.Mesh;

  // Camera Orbit State
  public orbitAngle = Math.PI / 4; // 45° canonical angle
  public orbitPitch = 0.62;
  public zoomDistance = 24.0;
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;

  // Radianite Dash Trail Particles
  private dashParticles: THREE.Points;
  private dashParticleGeo: THREE.BufferGeometry;
  private dashPositions: Float32Array;
  private dashAlphas: Float32Array;
  private readonly MAX_DASH_PARTICLES = 36;
  private dashSpawnTimer = 0;

  constructor(initialX = 0, initialZ = 4) {
    this.mesh = new THREE.Group();
    this.position = this.mesh.position;
    this.position.set(initialX, 0, initialZ);

    this.agentBodyGroup = new THREE.Group();
    this.mesh.add(this.agentBodyGroup);

    // Initialize Radianite Dash Particles
    const maxP = this.MAX_DASH_PARTICLES;
    this.dashPositions = new Float32Array(maxP * 3);
    this.dashAlphas = new Float32Array(maxP);
    this.dashParticleGeo = new THREE.BufferGeometry();
    this.dashParticleGeo.setAttribute('position', new THREE.BufferAttribute(this.dashPositions, 3));
    this.dashParticleGeo.setAttribute('alpha', new THREE.BufferAttribute(this.dashAlphas, 1));

    const particleMat = new THREE.PointsMaterial({
      color: 0x00f5d4,
      size: 0.18,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.dashParticles = new THREE.Points(this.dashParticleGeo, particleMat);
    this.mesh.add(this.dashParticles);

    this.buildTacticalAgentModel();
    this.setupInputListeners();
  }

  /**
   * Constructs the stylized Valorant Tactical Agent
   */
  private buildTacticalAgentModel() {
    // High-tech Tactical Materials
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x181e29, // Matte graphite carbon
      roughness: 0.35,
      metalness: 0.5,
    });
    const vestPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate
      roughness: 0.25,
      metalness: 0.7,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.6,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e2532, // Tactical cargo
      roughness: 0.65,
    });
    const radianiteGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });
    const crimsonTrimMat = new THREE.MeshStandardMaterial({
      color: 0xff4655,
      emissive: 0xff4655,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    // 1. Torso & Combat Tactical Vest (Tapered athletic silhouette)
    const torsoGeo = new THREE.BoxGeometry(0.58, 0.75, 0.34);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.agentBodyGroup.add(torso);

    // Front Chest Armor Plate with Angled Bevel
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.12), vestPlateMat);
    chestPlate.position.set(0, 1.15, 0.16);
    chestPlate.castShadow = true;
    this.agentBodyGroup.add(chestPlate);

    // Crimson Accent V-Stripe on chest
    const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.14), crimsonTrimMat);
    chestStripe.position.set(0, 1.25, 0.16);
    this.agentBodyGroup.add(chestStripe);

    // Radianite Energy Power Core on Upper Back
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
    const core = new THREE.Mesh(coreGeo, radianiteGlowMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 1.18, -0.2);
    this.agentBodyGroup.add(core);
    this.radianiteCore = core;

    // Tactical High Collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.28), armorMat);
    collar.position.set(0, 1.48, -0.02);
    this.agentBodyGroup.add(collar);

    // 2. Head with Cyber-Visor Optic HUD
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.68, 0);

    const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.36);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Stylized Dark Undercut Hair
    const hairGeo = new THREE.BoxGeometry(0.38, 0.16, 0.4);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.14, 0);
    this.headGroup.add(hair);

    // Wraparound Tactical Cyber-Visor with glowing cyan scanline
    const visorGeo = new THREE.BoxGeometry(0.39, 0.1, 0.15);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.14);
    this.headGroup.add(visor);

    const visorGlow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.16), radianiteGlowMat);
    visorGlow.position.set(0, 0.02, 0.14);
    this.headGroup.add(visorGlow);

    this.agentBodyGroup.add(this.headGroup);

    // 3. Arms & Tactical Combat Gauntlets
    // Left Arm Pivot
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.38, 1.35, 0);

    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), vestPlateMat);
    lShoulder.position.set(0, -0.08, 0);
    this.leftArmPivot.add(lShoulder);

    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.16), armorMat);
    lArm.position.set(0, -0.32, 0);
    lArm.castShadow = true;
    this.leftArmPivot.add(lArm);

    const lGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.18), vestPlateMat);
    lGauntlet.position.set(0, -0.52, 0);
    this.leftArmPivot.add(lGauntlet);

    this.agentBodyGroup.add(this.leftArmPivot);

    // Right Arm Pivot
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.38, 1.35, 0);

    const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), vestPlateMat);
    rShoulder.position.set(0, -0.08, 0);
    this.rightArmPivot.add(rShoulder);

    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.16), armorMat);
    rArm.position.set(0, -0.32, 0);
    rArm.castShadow = true;
    this.rightArmPivot.add(rArm);

    const rGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.18), vestPlateMat);
    rGauntlet.position.set(0, -0.52, 0);
    this.rightArmPivot.add(rGauntlet);

    this.agentBodyGroup.add(this.rightArmPivot);

    // 4. Legs & Combat Magnetic Boots
    // Left Leg Pivot
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.72, 0);

    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.22), pantsMat);
    lLeg.position.set(0, -0.24, 0);
    lLeg.castShadow = true;
    this.leftLegPivot.add(lLeg);

    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.28), armorMat);
    lBoot.position.set(0, -0.58, 0.03);
    lBoot.castShadow = true;
    this.leftLegPivot.add(lBoot);

    const lSoleGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.28), radianiteGlowMat);
    lSoleGlow.position.set(0, -0.71, 0.03);
    this.leftLegPivot.add(lSoleGlow);

    this.agentBodyGroup.add(this.leftLegPivot);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.72, 0);

    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.22), pantsMat);
    rLeg.position.set(0, -0.24, 0);
    rLeg.castShadow = true;
    this.rightLegPivot.add(rLeg);

    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.28), armorMat);
    rBoot.position.set(0, -0.58, 0.03);
    rBoot.castShadow = true;
    this.rightLegPivot.add(rBoot);

    const rSoleGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.28), radianiteGlowMat);
    rSoleGlow.position.set(0, -0.71, 0.03);
    this.rightLegPivot.add(rSoleGlow);

    this.agentBodyGroup.add(this.rightLegPivot);

    // 5. Circular Dynamic Ground Shadow
    const shadowGeo = new THREE.RingGeometry(0.1, 0.58, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.02;
    this.mesh.add(this.shadowMesh);

    // 6. Minimalist Overhead Tactical Badge
    this.setRole('admin', 'Admin');
  }

  /**
   * Generates a sleek Valorant-style champion status card
   */
  public setRole(role: 'admin' | 'architect' | 'employee' = 'admin', displayName = 'Admin') {
    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rankColor = role === 'admin' ? '#ff4655' : role === 'architect' ? '#00f5d4' : '#f59e0b';
    const rankTitle = role === 'admin' ? 'RADIANT' : role === 'architect' ? 'IMMORTAL' : 'ELITE';

    // Dark sleek chamfered card background
    ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
    ctx.fillRect(8, 8, 264, 48);

    ctx.strokeStyle = rankColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(8, 8, 264, 48);

    // Name
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 140, 32);

    // Rank Badge
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = rankColor;
    ctx.fillText(`[ ${rankTitle} ]`, 140, 48);

    const texture = new THREE.CanvasTexture(canvas);
    if (this.nameSprite) {
      this.nameSprite.material.map?.dispose();
      this.nameSprite.material.map = texture;
      this.nameSprite.material.needsUpdate = true;
    } else {
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      this.nameSprite = new THREE.Sprite(spriteMat);
      this.nameSprite.position.set(0, 2.3, 0);
      this.nameSprite.scale.set(1.5, 0.35, 1);
      this.agentBodyGroup.add(this.nameSprite);
    }
  }

  /**
   * Sets up instant, low-latency keyboard and mouse listeners
   */
  private setupInputListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      this.keys[e.code] = true;
      if (e.key) this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.key) this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
    });

    // Mouse Drag Orbit
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
      this.orbitPitch = Math.max(0.2, Math.min(1.15, this.orbitPitch + deltaY * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse Zoom
    window.addEventListener(
      'wheel',
      (e) => {
        if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
          this.zoomDistance = Math.max(8.0, Math.min(45.0, this.zoomDistance + e.deltaY * 0.02));
        }
      },
      { passive: true }
    );
  }

  /**
   * Core Update Loop: Responsive Movement, Banking, Particle Trails, and Physics
   */
  public update(
    delta: number,
    nodes: InteractiveNode[] = [],
    bounds = 48.0,
    colliders: WorldCollider[] = []
  ): {
    isMoving: boolean;
    nearbyNode: InteractiveNode | null;
  } {
    // 1. WASD Inputs
    const isW = !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w']);
    const isS = !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s']);
    const isA = !!(this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a']);
    const isD = !!(this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d']);
    const isSprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);

    // 2. Camera-Relative Directional Vectors
    const forwardX = -Math.sin(this.orbitAngle);
    const forwardZ = -Math.cos(this.orbitAngle);
    const rightX = Math.cos(this.orbitAngle);
    const rightZ = -Math.sin(this.orbitAngle);

    let moveX = 0;
    let moveZ = 0;

    if (isW) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (isS) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (isD) {
      moveX += rightX;
      moveZ += rightZ;
    }
    if (isA) {
      moveX -= rightX;
      moveZ -= rightZ;
    }

    const inputLen = Math.hypot(moveX, moveZ);
    const isMoving = inputLen > 0.001;
    const targetSpeed = isSprint ? this.sprintSpeed : this.walkSpeed;

    if (isMoving) {
      const dirX = moveX / inputLen;
      const dirZ = moveZ / inputLen;

      // Tight, esports-responsive acceleration
      const accel = Math.min(1, delta * 26);
      this.velocity.x += (dirX * targetSpeed - this.velocity.x) * accel;
      this.velocity.z += (dirZ * targetSpeed - this.velocity.z) * accel;

      // Smooth Heading Rotation
      const targetAngle = Math.atan2(dirX, dirZ);
      let diff = targetAngle - this.currentHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.currentHeading += diff * Math.min(1, delta * 20);
      this.agentBodyGroup.rotation.y = this.currentHeading;

      // Procedural Agent Banking (tilt into turns)
      const turnTilt = -diff * (isSprint ? 0.35 : 0.22);
      this.agentBodyGroup.rotation.z = THREE.MathUtils.lerp(
        this.agentBodyGroup.rotation.z,
        turnTilt,
        delta * 14
      );

      // Forward Sprint Lean
      const targetLean = isSprint ? -0.16 : -0.04;
      this.agentBodyGroup.rotation.x = THREE.MathUtils.lerp(
        this.agentBodyGroup.rotation.x,
        targetLean,
        delta * 12
      );

      // Stride Kinematics
      const cadence = isSprint ? 18 : 12;
      this.walkTime += delta * cadence;
      const legSwing = Math.sin(this.walkTime) * (isSprint ? 0.95 : 0.65);

      this.leftLegPivot.rotation.x = -legSwing;
      this.rightLegPivot.rotation.x = legSwing;
      this.leftArmPivot.rotation.x = legSwing;
      this.rightArmPivot.rotation.x = -legSwing;

      // Vertical Bobbing
      this.agentBodyGroup.position.y = Math.abs(Math.sin(this.walkTime * 2)) * 0.04;

      // Pulse Radianite Core
      if (this.radianiteCore) {
        const pulse = 1.6 + Math.sin(this.walkTime * 3) * 0.4;
        (this.radianiteCore.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
      }

      // Radianite Dash Particles (when sprinting)
      if (isSprint) {
        this.dashSpawnTimer += delta;
        if (this.dashSpawnTimer > 0.04) {
          this.dashSpawnTimer = 0;
          this.spawnDashParticle();
        }
      }
    } else {
      // Crisp Deceleration / Stop
      const friction = Math.min(1, delta * 28);
      this.velocity.x += (0 - this.velocity.x) * friction;
      this.velocity.z += (0 - this.velocity.z) * friction;
      if (Math.abs(this.velocity.x) < 0.005) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.005) this.velocity.z = 0;

      // Return to Idle Pose
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, delta * 16);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, delta * 16);
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, delta * 16);
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, delta * 16);
      this.agentBodyGroup.rotation.x = THREE.MathUtils.lerp(this.agentBodyGroup.rotation.x, 0, delta * 14);
      this.agentBodyGroup.rotation.z = THREE.MathUtils.lerp(this.agentBodyGroup.rotation.z, 0, delta * 14);
      this.agentBodyGroup.position.y = THREE.MathUtils.lerp(this.agentBodyGroup.position.y, 0, delta * 14);
    }

    // 3. Physical Continuous Collision Resolution & Frictionless Wall Sliding
    const newX = this.position.x + this.velocity.x * delta;
    const newZ = this.position.z + this.velocity.z * delta;

    const resolved = TacticalCollisionEngine.resolve(
      newX,
      newZ,
      this.velocity.x,
      this.velocity.z,
      colliders
    );

    this.position.x = resolved.x;
    this.position.z = resolved.z;
    this.velocity.x = resolved.vx;
    this.velocity.z = resolved.vz;

    // Boundary Limits
    this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
    this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

    // Update Dash Particles
    this.updateDashParticles(delta);

    // 4. Interactive Node Proximity
    let closestNode: InteractiveNode | null = null;
    let minDistance = 3.6;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dist = Math.hypot(this.position.x - n.position.x, this.position.z - n.position.z);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = n;
      }
    }

    return {
      isMoving,
      nearbyNode: closestNode,
    };
  }

  private spawnDashParticle() {
    const pIdx = Math.floor(Math.random() * this.MAX_DASH_PARTICLES);
    const i3 = pIdx * 3;
    this.dashPositions[i3] = (Math.random() - 0.5) * 0.4;
    this.dashPositions[i3 + 1] = 0.1 + Math.random() * 0.4;
    this.dashPositions[i3 + 2] = (Math.random() - 0.5) * 0.4 - 0.2;
    this.dashAlphas[pIdx] = 1.0;
    this.dashParticleGeo.attributes.position.needsUpdate = true;
  }

  private updateDashParticles(delta: number) {
    for (let i = 0; i < this.MAX_DASH_PARTICLES; i++) {
      if (this.dashAlphas[i] > 0) {
        this.dashAlphas[i] -= delta * 3.5;
        this.dashPositions[i * 3 + 1] += delta * 0.6;
      }
    }
    this.dashParticleGeo.attributes.position.needsUpdate = true;
  }

  public teleport(x: number, z: number) {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
  }

  public setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  public dispose() {
    // Cleanup particle and nametag textures
    this.dashParticleGeo.dispose();
  }
}
