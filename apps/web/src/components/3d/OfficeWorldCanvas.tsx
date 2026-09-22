'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { InnovationTowerFloor, InteractiveNode } from '@kynetra/contracts';
import { AvatarController } from './AvatarController';
import { sounds } from '../hud/SoundEffects';

interface OfficeWorldCanvasProps {
  floor: InnovationTowerFloor | null;
  onSelectNode: (node: InteractiveNode) => void;
  onDockWorkstation: (node: InteractiveNode) => void;
  isIncidentActive: boolean;
  selectedNodeId?: string;
  userRole?: 'admin' | 'architect' | 'employee';
}

export function OfficeWorldCanvas({
  floor,
  onSelectNode,
  onDockWorkstation,
  isIncidentActive,
  selectedNodeId,
  userRole = 'employee',
}: OfficeWorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarController | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<InteractiveNode | null>(null);
  const [cameraMode, setCameraMode] = useState<'follow' | 'docked'>('follow');
  const dockedTargetRef = useRef<THREE.Vector3 | null>(null);

  // Synchronize avatar nametag when user role changes
  useEffect(() => {
    if (avatarRef.current) {
      avatarRef.current.setRole(userRole);
    }
  }, [userRole]);

  // References for render loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const stationsGroupRef = useRef<THREE.Group | null>(null);
  const stationsRef = useRef<InteractiveNode[]>([]);
  const cloudsGroupRef = useRef<THREE.Group | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const alarmLightsRef = useRef<THREE.PointLight[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Mutable refs for loop to avoid re-mounting
  const isIncidentActiveRef = useRef(isIncidentActive);
  isIncidentActiveRef.current = isIncidentActive;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  // Handle interaction key [E]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyE' && nearbyPrompt) {
        sounds.playDockSound();
        onDockWorkstation(nearbyPrompt);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyPrompt, onDockWorkstation]);

  // Helper: Create Minecraft-Styled Floating 3D Sprite Billboard
  const createFloatingSprite = (text: string, icon: string, status: string, yPos = 2.4, isAlert = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Minecraft translucent nametag
      ctx.fillStyle = isAlert ? 'rgba(185, 28, 28, 0.92)' : 'rgba(24, 30, 42, 0.9)';
      ctx.fillRect(16, 16, 480, 96);

      ctx.lineWidth = 4;
      ctx.strokeStyle = isAlert ? '#fca5a5' : '#f59e0b';
      ctx.strokeRect(16, 16, 480, 96);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${icon} ${text}`, 256, 55);

      ctx.fillStyle = isAlert ? '#fecaca' : '#fbbf24';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(status, 256, 92);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.y = yPos;
    sprite.scale.set(3.2, 0.8, 1);
    return sprite;
  };

  // Helper: Build Handcrafted Voxel Workstation Desk (Oak Planks + Iron Brackets)
  const buildWorkstationDesk = (
    nodeData: InteractiveNode,
    isDouble = true,
    hasServerRacks = false,
    isEmergency = false
  ) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    // 1. Oak Plank Desktop
    const deskGeo = new THREE.BoxGeometry(2.6, 0.12, 1.3);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0xb08968, // Warm oak planks
      roughness: 0.65,
      metalness: 0.05,
    });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.y = 0.95;
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);

    // Iron Ingot Corner Brackets
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.3 });
    [[-1.25, -0.6], [1.25, -0.6], [-1.25, 0.6], [1.25, 0.6]].forEach(([bx, bz]) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), bracketMat);
      bracket.position.set(bx, 0.95, bz);
      group.add(bracket);
    });

    // 2. Chunky Spruce Wood Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.8 });
    const legGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
    [[-1.15, -0.5], [1.15, -0.5], [-1.15, 0.5], [1.15, 0.5]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.475, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // 3. Primary Thin-Bezel Monitor
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.32, 12), standMat);
    stand.position.set(0, 1.15, -0.2);
    group.add(stand);

    const screenFrameGeo = new THREE.BoxGeometry(1.25, 0.72, 0.05);
    const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
    screenFrame.position.set(0, 1.5, -0.2);
    screenFrame.castShadow = true;
    group.add(screenFrame);

    const screenDisplayGeo = new THREE.PlaneGeometry(1.18, 0.66);
    const screenDisplayMat = new THREE.MeshBasicMaterial({
      color: isEmergency ? 0xef4444 : 0x0f172a,
    });
    const screenDisplay = new THREE.Mesh(screenDisplayGeo, screenDisplayMat);
    screenDisplay.position.set(0, 1.5, -0.17);
    group.add(screenDisplay);

    // 4. Secondary Angled Monitor
    if (isDouble) {
      const stand2 = stand.clone();
      stand2.position.set(0.92, 1.15, -0.1);
      group.add(stand2);

      const screen2 = screenFrame.clone();
      screen2.position.set(0.92, 1.5, -0.1);
      screen2.rotation.y = -0.32;
      group.add(screen2);

      const display2 = screenDisplay.clone();
      display2.position.set(0.92, 1.5, -0.07);
      display2.rotation.y = -0.32;
      group.add(display2);
    }

    // 5. Mechanical Keyboard & Redstone Mouse
    const kbGeo = new THREE.BoxGeometry(0.65, 0.03, 0.22);
    const kbMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const kb = new THREE.Mesh(kbGeo, kbMat);
    kb.position.set(0, 1.03, 0.18);
    group.add(kb);

    const mouseMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.12), mouseMat);
    mouse.position.set(0.45, 1.03, 0.18);
    group.add(mouse);

    // 6. Minecraft Voxel Chair (Oak wood + Navy wool seat)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.65), seatMat);
    seat.position.set(0, 0.6, 0.85);
    seat.castShadow = true;
    group.add(seat);

    const backrestMat = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.7 });
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.08), backrestMat);
    backrest.position.set(0, 1.05, 1.15);
    backrest.castShadow = true;
    group.add(backrest);

    // Chair Spruce Legs
    [[-0.26, 0.56], [0.26, 0.56], [-0.26, 1.14], [0.26, 1.14]].forEach(([cx, cz]) => {
      const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), legMat);
      cLeg.position.set(cx, 0.275, cz);
      cLeg.castShadow = true;
      group.add(cLeg);
    });

    // 7. Redstone Lamp / Observer Style Server Rack
    if (hasServerRacks) {
      const rackGeo = new THREE.BoxGeometry(1.2, 2.8, 1.0);
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(2.2, 1.4, -0.2);
      rack.castShadow = true;
      group.add(rack);

      // Redstone lamp indicator blocks
      for (let i = 0; i < 5; i++) {
        const lampGeo = new THREE.BoxGeometry(0.9, 0.35, 0.05);
        const lampMat = new THREE.MeshStandardMaterial({
          color: isEmergency ? 0xef4444 : (i % 2 === 0 ? 0xf59e0b : 0x22c55e),
          emissive: isEmergency ? 0xb91c1c : (i % 2 === 0 ? 0xd97706 : 0x15803d),
          emissiveIntensity: 0.7,
        });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(2.2, 0.55 + i * 0.45, 0.33);
        group.add(lamp);
      }
    }

    // Floating Minecraft nametag billboard
    const promptText = isEmergency ? '🚨 SRE INCIDENT: FIX REQUIRED' : 'CLICK OR [E] TO WORK';
    const deskSprite = createFloatingSprite(nodeData.name, '💻', promptText, 2.7, isEmergency);
    group.add(deskSprite);

    return group;
  };

  // Helper: Build Aria AI Holographic Reception Pod (Smooth Quartz + Lapis Diamond)
  const buildAriaReceptionPod = (nodeData: InteractiveNode) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    // Quartz Pedestal
    const baseGeo = new THREE.BoxGeometry(2.4, 0.4, 2.4);
    const quartzMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, quartzMat);
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);

    // Gold Inlay Ring
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const goldRim = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 2.5), goldMat);
    goldRim.position.y = 0.42;
    group.add(goldRim);

    // Floating Diamond Crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.name = 'aria_hologram';
    crystal.position.y = 1.9;
    group.add(crystal);

    const ariaSprite = createFloatingSprite('Aria (AI Concierge)', '🤖', 'CLICK TO CONSULT', 2.8);
    group.add(ariaSprite);

    return group;
  };

  // Helper: Build Competitive Coding Pod (Lapis Lazuli + Quartz)
  const buildCodingPod = (nodeData: InteractiveNode) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    // Lapis block base
    const podGeo = new THREE.BoxGeometry(2.6, 0.8, 2.6);
    const lapisMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
    const pod = new THREE.Mesh(podGeo, lapisMat);
    pod.position.y = 0.4;
    pod.castShadow = true;
    group.add(pod);

    // Gold trim
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 2.7), trimMat);
    trim.position.y = 0.82;
    group.add(trim);

    // Duel screen terminal
    const screenGeo = new THREE.BoxGeometry(1.4, 0.8, 0.1);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.4, 0);
    group.add(screen);

    const podSprite = createFloatingSprite(nodeData.name, '⚔️', 'READY FOR DUEL', 2.6);
    group.add(podSprite);

    return group;
  };

  // Helper: Build Architecture Whiteboard (Oak Easel + Canvas)
  const buildWhiteboard = (nodeData: InteractiveNode) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    // Whiteboard Canvas
    const boardGeo = new THREE.BoxGeometry(3.6, 2.0, 0.08);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 1.8;
    group.add(board);

    // Oak Wood Frame
    const frameGeo = new THREE.BoxGeometry(3.76, 2.16, 0.06);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.7 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 1.8;
    group.add(frame);

    // Conference Table (Warm Oak Planks)
    const tableGeo = new THREE.BoxGeometry(3.2, 0.12, 1.6);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xa0714f, roughness: 0.6 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.9, -1.8);
    table.castShadow = true;
    group.add(table);

    const wbSprite = createFloatingSprite(nodeData.name, '📋', 'ARCHITECTURE BOARD', 3.2);
    group.add(wbSprite);

    return group;
  };

  // Populate stations into stationsGroupRef
  const populateStations = (currentFloor: InnovationTowerFloor | null) => {
    if (!stationsGroupRef.current) return;
    const group = stationsGroupRef.current;
    group.clear();
    nodeMeshesRef.current.clear();

    const stationsToRender: InteractiveNode[] = (currentFloor?.nodes && currentFloor.nodes.length > 0)
      ? currentFloor.nodes
      : [
          {
            id: 'node-dev-desk-1',
            name: 'Desk 01: Full-Stack IDE Lab',
            type: 'terminal',
            position: { x: -8, y: 1, z: 4 },
            description: 'TypeScript & Next.js development workstation with code editor and terminal.',
            activeSessionCount: 1,
          },
          {
            id: 'node-sre-noc',
            name: 'Desk 02: Cloud & SRE Incident NOC',
            type: 'terminal',
            position: { x: 6, y: 1, z: 0 },
            description: 'NOC telemetry console with Kubernetes server racks.',
            activeSessionCount: 0,
          },
          {
            id: 'node-reception-aria',
            name: 'Aria (AI Concierge Pod)',
            type: 'receptionist_npc',
            position: { x: 0, y: 1, z: -8 },
            description: 'AI guide and architectural mentor.',
            activeSessionCount: 0,
          },
          {
            id: 'node-battle-pod-alpha',
            name: 'Battle Pod Alpha (Multiplayer)',
            type: 'coding_pod',
            position: { x: -8, y: 1, z: -6 },
            description: 'Competitive coding station with live unit testing harness.',
            activeSessionCount: 0,
          },
          {
            id: 'node-battle-pod-beta',
            name: 'Battle Pod Beta (Multiplayer)',
            type: 'coding_pod',
            position: { x: 8, y: 1, z: -6 },
            description: 'High-stakes algorithmic challenge pod.',
            activeSessionCount: 0,
          },
          {
            id: 'node-whiteboard',
            name: 'System Architecture Whiteboard',
            type: 'whiteboard',
            position: { x: -10, y: 1, z: -2 },
            description: 'Collaborative architectural whiteboard.',
            activeSessionCount: 0,
          },
        ];

    stationsRef.current = stationsToRender;

    stationsToRender.forEach((node) => {
      let nodeMesh: THREE.Group;
      if (node.type === 'receptionist_npc') {
        nodeMesh = buildAriaReceptionPod(node);
      } else if (node.type === 'coding_pod') {
        nodeMesh = buildCodingPod(node);
      } else if (node.type === 'whiteboard') {
        nodeMesh = buildWhiteboard(node);
      } else {
        const hasServer = node.id.includes('sre') || node.name.toLowerCase().includes('sre') || node.name.toLowerCase().includes('cloud');
        const isEmergency = isIncidentActiveRef.current && (node.id.includes('sre') || node.name.toLowerCase().includes('sre') || node.id.includes('dev'));
        nodeMesh = buildWorkstationDesk(node, true, hasServer, isEmergency);
      }
      group.add(nodeMesh);
      nodeMeshesRef.current.set(node.id, nodeMesh);
    });
  };

  // ONE-TIME WebGL Initializer: Scene, Daylight Sky, Oak Floors, Voxel Clouds, Avatar
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = Math.max(container.clientWidth || window.innerWidth, 400);
    const height = Math.max(container.clientHeight || 650, 500);

    // 1. Scene Setup: Bright sunny Minecraft daylight sky
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x78a7ff); // Classic Minecraft blue sky
    scene.fog = new THREE.Fog(0x93c5fd, 42, 95); // Soft daylight horizon mist

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 150);
    camera.position.set(0, 10, 14);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.replaceChildren(renderer.domElement);

    // 4. Warm Daylight Lighting (Morning Golden Sun)
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 1.25);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.3);
    sunLight.position.set(16, 26, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 65;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.75);
    fillLight.position.set(-16, 14, -12);
    scene.add(fillLight);

    // Warm redstone emergency alarms
    alarmLightsRef.current = [];
    const alarmPositions = [[-6, 4, 0], [6, 4, 0], [0, 4, -8]];
    alarmPositions.forEach(([ax, ay, az]) => {
      const alarm = new THREE.PointLight(0xef4444, isIncidentActiveRef.current ? 3.5 : 0, 18);
      alarm.position.set(ax, ay, az);
      scene.add(alarm);
      alarmLightsRef.current.push(alarm);
    });

    // 5. Minecraft Voxel Clouds (Floating overhead)
    const cloudsGroup = new THREE.Group();
    cloudsGroupRef.current = cloudsGroup;
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });

    for (let c = 0; c < 16; c++) {
      const cw = 5 + Math.random() * 6;
      const cd = 4 + Math.random() * 5;
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.9, cd), cloudMat);
      cloud.position.set(-35 + Math.random() * 70, 18 + Math.random() * 3, -35 + Math.random() * 70);
      cloudsGroup.add(cloud);
    }
    scene.add(cloudsGroup);

    // 6. Warm Oak Plank Floor (36m x 36m)
    const roomSize = 36;
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xa0714f, // Warm Oak Planks
      roughness: 0.65,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Dark Spruce Divider Grid
    const grid = new THREE.GridHelper(roomSize, 36, 0x582f0e, 0x7f5539);
    grid.position.y = 0.01;
    scene.add(grid);

    // Perimeter Stone Brick Curb
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const northCurb = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 0.25, 0.4), curbMat);
    northCurb.position.set(0, 0.125, -roomSize / 2 + 0.2);
    scene.add(northCurb);

    // Woven Wool Area Rugs (Lapis Lazuli, Terracotta, Emerald)
    const createWoolRug = (x: number, z: number, w: number, d: number, color: number) => {
      const rugGeo = new THREE.PlaneGeometry(w, d);
      const rugMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      const rug = new THREE.Mesh(rugGeo, rugMat);
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(x, 0.015, z);
      rug.receiveShadow = true;
      scene.add(rug);
    };
    createWoolRug(-8, 4, 6.5, 5.5, 0x1d4ed8); // Lapis Blue Wool Rug
    createWoolRug(6, 0, 8.5, 6.5, 0xd97706);  // Terracotta Orange Wool Rug
    createWoolRug(0, 10, 10.5, 6.5, 0x15803d); // Emerald Green Wool Rug

    // 7. Panoramic Glass Windows looking into Minecraft rolling hills
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.7 }); // Spruce frame
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
    });

    for (let wx = -14; wx <= 14; wx += 7) {
      const winGeo = new THREE.PlaneGeometry(5.8, 6.5);
      const win = new THREE.Mesh(winGeo, glassMat);
      win.position.set(wx, 3.8, -roomSize / 2 + 0.1);
      scene.add(win);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.2, 0.2), frameMat);
      frame.position.set(wx, 7.05, -roomSize / 2 + 0.1);
      scene.add(frame);
    }

    // Distant Minecraft Hills & Voxel Trees outside
    const terrainGroup = new THREE.Group();
    for (let h = 0; h < 18; h++) {
      const hw = 6 + Math.random() * 8;
      const hh = 4 + Math.random() * 10;
      const hd = 6 + Math.random() * 8;
      const hillGeo = new THREE.BoxGeometry(hw, hh, hd);
      const hillMat = new THREE.MeshStandardMaterial({
        color: h % 2 === 0 ? 0x22c55e : 0x16a34a,
        roughness: 0.9,
      });
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.position.set(-35 + Math.random() * 70, hh / 2 - 2, -roomSize / 2 - 10 - Math.random() * 18);
      terrainGroup.add(hill);

      // Add blocky oak trees on hilltops
      if (h % 3 === 0) {
        const trunk = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 3.5, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.85 })
        );
        trunk.position.set(hill.position.x, hill.position.y + hh / 2 + 1.75, hill.position.z);
        terrainGroup.add(trunk);

        const leaves = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.2, 2.6),
          new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 })
        );
        leaves.position.set(trunk.position.x, trunk.position.y + 2.0, trunk.position.z);
        terrainGroup.add(leaves);
      }
    }
    scene.add(terrainGroup);

    // 8. Student Break Lounge (Birch Sofa + Potted Oak Bushes + Coffee Brewer)
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(0, 0, 10);

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 }); // Navy wool
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 1.2), sofaMat);
    sofaSeat.position.set(0, 0.35, 0);
    sofaSeat.castShadow = true;
    loungeGroup.add(sofaSeat);

    const birchMat = new THREE.MeshStandardMaterial({ color: 0xd6c4a5, roughness: 0.7 }); // Birch wood
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.3), birchMat);
    sofaBack.position.set(0, 0.8, 0.5);
    sofaBack.castShadow = true;
    loungeGroup.add(sofaBack);

    // Stone Slab Coffee Table
    const tableMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.45, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 })
    );
    tableMesh.position.set(0, 0.25, -1.2);
    tableMesh.castShadow = true;
    loungeGroup.add(tableMesh);

    // Brewing stand / espresso machine
    const brewer = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.45, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
    );
    brewer.position.set(0, 0.7, -1.2);
    loungeGroup.add(brewer);

    // Terracotta Flower Pot & Blocky Oak Bush
    const potGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 }); // Terracotta
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(-2.2, 0.3, 1.2);
    loungeGroup.add(pot);

    const bushGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(-2.2, 1.2, 1.2);
    loungeGroup.add(bush);

    const loungeSprite = createFloatingSprite('Student Break Lounge', '☕', 'COMMUNITY SPACE', 2.4);
    loungeGroup.add(loungeSprite);
    scene.add(loungeGroup);

    // 9. Stations Group
    const stationsGroup = new THREE.Group();
    stationsGroupRef.current = stationsGroup;
    scene.add(stationsGroup);

    // Initial station population
    populateStations(floor);

    // 10. Student Avatar Controller (Minecraft Voxel Character)
    const avatar = new AvatarController();
    scene.add(avatar.mesh);
    avatarRef.current = avatar;

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !camera || !renderer) return;
      const newW = Math.max(container.clientWidth, 400);
      const newH = Math.max(container.clientHeight, 400);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // 12. 60 FPS Render Loop with Drifting Clouds & Articulated Avatar
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Drift voxel clouds slowly across the sky
      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.children.forEach((cloud) => {
          cloud.position.x += delta * 0.45;
          if (cloud.position.x > 38) cloud.position.x = -38;
        });
      }

      // Update Student Avatar & Proximity
      const { nearbyNode } = avatar.update(delta, stationsRef.current);
      setNearbyPrompt(nearbyNode);

      // Pulsing alarm strobes if active incident
      if (isIncidentActiveRef.current) {
        const pulse = (Math.sin(currentTime * 0.008) + 1) * 2.2;
        alarmLightsRef.current.forEach((light) => {
          light.intensity = pulse;
        });
      } else {
        alarmLightsRef.current.forEach((light) => {
          light.intensity = 0;
        });
      }

      // Rotate Aria Hologram Crystal
      const ariaMesh = scene.getObjectByName('aria_hologram');
      if (ariaMesh) {
        ariaMesh.rotation.y += delta * 1.5;
        ariaMesh.rotation.x = Math.sin(currentTime * 0.002) * 0.2;
      }

      // Smooth Camera Positioning
      if (cameraModeRef.current === 'docked' && dockedTargetRef.current) {
        camera.position.lerp(dockedTargetRef.current, delta * 5);
        camera.lookAt(dockedTargetRef.current.x, 1.4, dockedTargetRef.current.z);
      } else {
        const camX = avatar.position.x + Math.sin(avatar.orbitAngle) * avatar.zoomDistance;
        const camY = avatar.position.y + Math.sin(avatar.orbitPitch) * avatar.zoomDistance + 1.2;
        const camZ = avatar.position.z + Math.cos(avatar.orbitAngle) * avatar.zoomDistance;

        const targetCamPos = new THREE.Vector3(camX, Math.max(camY, 1.8), camZ);
        camera.position.lerp(targetCamPos, delta * 8);
        camera.lookAt(avatar.position.x, avatar.position.y + 1.3, avatar.position.z);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup ONLY on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      avatar.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount!

  // Update stations when floor changes without re-mounting WebGL scene
  const prevFloorNumberRef = useRef<number | null>(null);
  useEffect(() => {
    if (!stationsGroupRef.current) return;
    if (floor?.floorNumber !== prevFloorNumberRef.current) {
      prevFloorNumberRef.current = floor?.floorNumber ?? null;
      populateStations(floor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor?.floorNumber]);

  // Update Incident Alarm styling dynamically without re-mounting
  useEffect(() => {
    if (!sceneRef.current) return;
    // In incident mode: sky shifts to dusky redstone storm, otherwise bright blue
    sceneRef.current.background = new THREE.Color(isIncidentActive ? 0x2e1015 : 0x78a7ff);
    if (sceneRef.current.fog instanceof THREE.Fog) {
      sceneRef.current.fog.color.setHex(isIncidentActive ? 0x3f1d24 : 0x93c5fd);
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(isIncidentActive ? 0xfecaca : 0xf1f5f9);
      ambientLightRef.current.intensity = isIncidentActive ? 1.4 : 1.25;
    }
    // Rebuild station sprites to show emergency alert banners if needed
    populateStations(floor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncidentActive]);

  // Handle Canvas Click to Select and Dock
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      let current: THREE.Object3D | null = hit.object;
      while (current && !current.userData.node) {
        current = current.parent;
      }
      if (current && current.userData.node) {
        const clickedNode: InteractiveNode = current.userData.node;
        sounds.playKeyClick();
        onSelectNode(clickedNode);
        sounds.playDockSound();
        onDockWorkstation(clickedNode);
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        background: '#78a7ff',
      }}
    >
      {/* HUD Top Left: Floor & Viewport Info */}
      <div
        style={{
          position: 'absolute',
          top: '72px',
          left: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'rgba(30, 41, 59, 0.9)',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            backdropFilter: 'blur(8px)',
            color: '#fbbf24',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.35)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isIncidentActive ? 'var(--accent-rose)' : 'var(--accent-emerald)',
            }}
          ></span>
          <span>{floor?.name ? `FLOOR ${floor.floorNumber}: ${floor.name.toUpperCase()}` : 'STUDENT ENGINEERING FLOOR'}</span>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            paddingLeft: '6px',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          CONTROLS: WASD to Walk • Click-Drag to Orbit • Scroll to Zoom
        </div>
      </div>

      {/* Proximity Interaction Prompt Floating Overlay */}
      {nearbyPrompt && (
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 24px',
            borderRadius: '14px',
            background: isIncidentActive ? 'rgba(185, 28, 28, 0.95)' : 'rgba(30, 41, 59, 0.95)',
            border: isIncidentActive ? '2px solid #f87171' : '2px solid #f59e0b',
            backdropFilter: 'blur(10px)',
            boxShadow: isIncidentActive
              ? '0 0 35px rgba(239, 68, 68, 0.5)'
              : '0 8px 25px rgba(0, 0, 0, 0.45)',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <span style={{ fontSize: '14px', color: '#fbbf24' }}>{nearbyPrompt.name}</span>
            <div style={{ fontSize: '11px', color: isIncidentActive ? '#fee2e2' : '#cbd5e1', fontWeight: 500 }}>
              {isIncidentActive ? '🚨 Active SRE Incident detected at this station' : 'Workstation ready for interactive session'}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              sounds.playDockSound();
              onDockWorkstation(nearbyPrompt);
            }}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: isIncidentActive ? '#fff' : undefined,
              color: isIncidentActive ? '#991b1b' : undefined,
            }}
          >
            Press [E] to Dock
          </button>
        </div>
      )}

      {/* Selected Node Bottom Drawer Indicator */}
      {selectedNodeId && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            zIndex: 10,
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#cbd5e1',
          }}
        >
          Target: {selectedNodeId}
        </div>
      )}
    </div>
  );
}
