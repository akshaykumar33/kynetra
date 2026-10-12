import * as THREE from 'three';
import type { InteractiveNode } from '@kynetra/contracts';
import type { WorldCollider } from './WorldColliders';

export class AvatarController {
  public mesh: THREE.Group;
  private keys: Record<string, boolean> = {};
  public position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private walkSpeed = 12.0; // Fast responsive walking speed
  private sprintSpeed = 18.5; // High-speed sprint when holding Shift
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

  // Camera Orbit & Zoom State - Default to 45° Isometric Perspective matching artwork
  public orbitAngle = Math.PI / 4; // 45-degree isometric diagonal angle
  public orbitPitch = 0.62; // 35.5-degree isometric elevation pitch
  public zoomDistance = 28.0; // Elevated overview distance
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

      // Orbit horizontal and pitch vertical
      this.orbitAngle -= deltaX * 0.006;
      this.orbitPitch = Math.max(0.15, Math.min(1.2, this.orbitPitch + deltaY * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('wheel', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
        this.zoomDistance = Math.max(10.0, Math.min(48.0, this.zoomDistance + e.deltaY * 0.02));
      }
    }, { passive: true });
  }

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

    // 2. Camera-Relative Vectors in Ground Plane (XZ)
    // The camera orbits at (sin(orbitAngle), pitch, cos(orbitAngle)) relative to avatar.
    // Moving FORWARD into the screen (away from camera) means heading: (-sin(orbitAngle), -cos(orbitAngle)).
    const forwardX = -Math.sin(this.orbitAngle);
    const forwardZ = -Math.cos(this.orbitAngle);

    // Moving RIGHT relative to camera view: (cos(orbitAngle), -sin(orbitAngle)).
    const rightX = Math.cos(this.orbitAngle);
    const rightZ = -Math.sin(this.orbitAngle);

    // Calculate aggregate direction
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

      // Smooth, responsive acceleration
      const targetVelX = nx * targetSpeed;
      const targetVelZ = nz * targetSpeed;
      const accel = Math.min(1, delta * 22);
      this.velocity.x += (targetVelX - this.velocity.x) * accel;
      this.velocity.z += (targetVelZ - this.velocity.z) * accel;

      // Smooth shortest-arc rotation towards heading
      const targetAngle = Math.atan2(nx, nz);
      let diff = targetAngle - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, delta * 18);

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
      // Crisp friction / deceleration
      const friction = Math.min(1, delta * 24);
      this.velocity.x += (0 - this.velocity.x) * friction;
      this.velocity.z += (0 - this.velocity.z) * friction;
      if (Math.abs(this.velocity.x) < 0.005) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.005) this.velocity.z = 0;

      // Return limbs to neutral idle pose smoothly
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

    // 3. Movement with Axis-Separated Physical Collision Resolution & Wall Sliding
    const moveStepX = this.velocity.x * delta;
    const moveStepZ = this.velocity.z * delta;

    if (Math.abs(moveStepX) > 0.0001 || Math.abs(moveStepZ) > 0.0001) {
      // Move X and resolve X collisions (allows sliding along Z-facing walls)
      this.position.x += moveStepX;
      this.resolveCollisions(colliders, 'x', moveStepX);

      // Move Z and resolve Z collisions (allows sliding along X-facing walls)
      this.position.z += moveStepZ;
      this.resolveCollisions(colliders, 'z', moveStepZ);

      // Corner and diagonal penetration relaxation pass
      this.resolveCollisions(colliders, 'both');
    } else {
      // Stationary relaxation pass to prevent clipping if objects spawn or stage transitions
      this.resolveCollisions(colliders, 'both');
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

  private resolveCollisions(
    colliders: WorldCollider[],
    axis: 'x' | 'z' | 'both',
    moveStep = 0
  ) {
    const r = 0.42;

    for (const col of colliders) {
      if (col.type === 'box') {
        const { minX, maxX, minZ, maxZ } = col;

        if (axis === 'x') {
          // Check if avatar Z is in the range of this box
          if (this.position.z >= minZ - r && this.position.z <= maxZ + r) {
            // Check if avatar X overlaps
            if (this.position.x > minX - r && this.position.x < maxX + r) {
              if (moveStep > 0) {
                this.position.x = minX - r;
                this.velocity.x = 0;
              } else if (moveStep < 0) {
                this.position.x = maxX + r;
                this.velocity.x = 0;
              } else {
                const distLeft = Math.abs(this.position.x - (minX - r));
                const distRight = Math.abs(this.position.x - (maxX + r));
                this.position.x = distLeft < distRight ? minX - r : maxX + r;
                this.velocity.x = 0;
              }
            }
          }
        } else if (axis === 'z') {
          // Check if avatar X is in the range of this box
          if (this.position.x >= minX - r && this.position.x <= maxX + r) {
            // Check if avatar Z overlaps
            if (this.position.z > minZ - r && this.position.z < maxZ + r) {
              if (moveStep > 0) {
                this.position.z = minZ - r;
                this.velocity.z = 0;
              } else if (moveStep < 0) {
                this.position.z = maxZ + r;
                this.velocity.z = 0;
              } else {
                const distNorth = Math.abs(this.position.z - (minZ - r));
                const distSouth = Math.abs(this.position.z - (maxZ + r));
                this.position.z = distNorth < distSouth ? minZ - r : maxZ + r;
                this.velocity.z = 0;
              }
            }
          }
        } else {
          // 'both': 2D continuous circle vs box penetration relaxation
          const cx = Math.max(minX, Math.min(maxX, this.position.x));
          const cz = Math.max(minZ, Math.min(maxZ, this.position.z));
          const diffX = this.position.x - cx;
          const diffZ = this.position.z - cz;
          const distSq = diffX * diffX + diffZ * diffZ;

          if (
            this.position.x >= minX &&
            this.position.x <= maxX &&
            this.position.z >= minZ &&
            this.position.z <= maxZ
          ) {
            // Fully inside box: push out along minimal penetration axis
            const dLeft = this.position.x - minX;
            const dRight = maxX - this.position.x;
            const dTop = this.position.z - minZ;
            const dBottom = maxZ - this.position.z;
            const m = Math.min(dLeft, dRight, dTop, dBottom);
            if (m === dLeft) this.position.x = minX - r;
            else if (m === dRight) this.position.x = maxX + r;
            else if (m === dTop) this.position.z = minZ - r;
            else this.position.z = maxZ + r;
          } else if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = r - dist;
              this.position.x += (diffX / dist) * overlap;
              this.position.z += (diffZ / dist) * overlap;
            }
          }
        }
      } else if (col.type === 'circle') {
        const { x: cx, z: cz, radius: cr } = col;
        const totalR = r + cr;

        if (axis === 'x') {
          const dz = Math.abs(this.position.z - cz);
          if (dz < totalR) {
            const maxDx = Math.sqrt(Math.max(0, totalR * totalR - dz * dz));
            if (this.position.x > cx - maxDx && this.position.x < cx + maxDx) {
              if (moveStep > 0) {
                this.position.x = cx - maxDx;
                this.velocity.x = 0;
              } else if (moveStep < 0) {
                this.position.x = cx + maxDx;
                this.velocity.x = 0;
              } else {
                this.position.x = this.position.x < cx ? cx - maxDx : cx + maxDx;
                this.velocity.x = 0;
              }
            }
          }
        } else if (axis === 'z') {
          const dx = Math.abs(this.position.x - cx);
          if (dx < totalR) {
            const maxDz = Math.sqrt(Math.max(0, totalR * totalR - dx * dx));
            if (this.position.z > cz - maxDz && this.position.z < cz + maxDz) {
              if (moveStep > 0) {
                this.position.z = cz - maxDz;
                this.velocity.z = 0;
              } else if (moveStep < 0) {
                this.position.z = cz + maxDz;
                this.velocity.z = 0;
              } else {
                this.position.z = this.position.z < cz ? cz - maxDz : cz + maxDz;
                this.velocity.z = 0;
              }
            }
          }
        } else {
          // 'both': circle vs circle penetration
          const diffX = this.position.x - cx;
          const diffZ = this.position.z - cz;
          const distSq = diffX * diffX + diffZ * diffZ;
          if (distSq < totalR * totalR) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = totalR - dist;
              this.position.x += (diffX / dist) * overlap;
              this.position.z += (diffZ / dist) * overlap;
            } else {
              this.position.x += totalR;
            }
          }
        }
      }
    }
  }

  public getNearbyNodeId(): string | null {
    return this.nearbyNodeId;
  }

  public setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
  }

  public teleport(x: number, z: number) {
    this.position.set(x, 0, z);
  }


  public showEmote(emoji: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Glow circle background
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

