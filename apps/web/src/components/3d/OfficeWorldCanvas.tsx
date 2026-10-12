'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type {
  InnovationTowerFloor,
  InteractiveNode,
  SpatialPeer,
  SpatialZone,
  SpatialEmote,
  WorldPlot,
} from '@kynetra/contracts';
import { AvatarController } from './AvatarController';
import { sounds } from '../hud/SoundEffects';
import { buildPlotsAndRoads, buildCompanyBuilding } from './PlotsAndRoadsBuilder';
import { OUTDOOR_COLLIDERS, WORKSPACE_COLLIDERS } from './WorldColliders';

const OFFICE_SPATIAL_ZONES: SpatialZone[] = [
  {
    id: 'zone-admin-suite',
    name: 'Executive Admin Workspace',
    type: 'workstation',
    color: '#f59e0b',
    description: 'High-clearance executive workspace with user management & RBAC master terminal.',
    bounds: { minX: 3.5, maxX: 10.5, minZ: 5.0, maxZ: 11.5 },
  },
  {
    id: 'zone-all-hands',
    name: 'All-Hands Agora (Conference)',
    type: 'meeting',
    color: '#0284c7',
    description: 'Collaborative meeting room. All occupants share an open video conference.',
    bounds: { minX: -11, maxX: -4, minZ: -10, maxZ: -3 },
  },
  {
    id: 'zone-focus-pod',
    name: 'Deep Focus Acoustic Pod',
    type: 'silent',
    color: '#8b5cf6',
    description: 'Acoustic isolation pod. Mutes incoming proximity video calls for distraction-free deep work.',
    bounds: { minX: 4, maxX: 10, minZ: -10, maxZ: -4 },
  },
  {
    id: 'zone-coffee-lounge',
    name: 'Cyber Cafe & Social Lounge',
    type: 'lounge',
    color: '#f59e0b',
    description: 'Informal breakout space for casual conversations and watercooler syncs.',
    bounds: { minX: -10, maxX: -4, minZ: 4, maxZ: 10 },
  },
  {
    id: 'zone-workstation-quad',
    name: 'Engineering Workstation Bay',
    type: 'workstation',
    color: '#10b981',
    description: 'Primary workstation desks with IDE workbench and incident monitoring terminals.',
    bounds: { minX: 3, maxX: 11, minZ: -3, maxZ: 4 },
  },
];

interface OfficeWorldCanvasProps {
  floor: InnovationTowerFloor | null;
  worldPlots?: WorldPlot[];
  onSelectNode: (node: InteractiveNode) => void;
  onDockWorkstation: (node: InteractiveNode) => void;
  isIncidentActive: boolean;
  selectedNodeId?: string;
  userRole?: 'admin' | 'architect' | 'employee';
  displayName?: string;
  peers?: SpatialPeer[];
  localPeerId?: string;
  localUserId?: string;
  onUpdatePosition?: (x: number, y: number, z: number, rotation: number) => void;
  onZoneChange?: (zone: SpatialZone | null) => void;
  activeEmote?: SpatialEmote | null;
  teleportTarget?: { x: number; z: number } | null;
  onTeleportCompleted?: () => void;
  currentStage?: 'plot' | 'company' | 'workspace';
  onStageChange?: (stage: 'plot' | 'company' | 'workspace') => void;
  onOpenPlotDeed?: (plot?: WorldPlot) => void;
  isSurveyorActive?: boolean;
  onToggleSurveyor?: () => void;
  viewMode?: '3d' | 'iso';
  onToggleViewMode?: () => void;
}

export function OfficeWorldCanvas({
  floor,
  worldPlots = [],
  onSelectNode,
  onDockWorkstation,
  isIncidentActive,
  selectedNodeId,
  userRole = 'employee',
  displayName = 'Admin',
  peers = [],
  localPeerId,
  localUserId,
  onUpdatePosition,
  onZoneChange,
  activeEmote,
  teleportTarget,
  onTeleportCompleted,
  currentStage = 'plot',
  onStageChange,
  onOpenPlotDeed,
  isSurveyorActive = false,
  onToggleSurveyor,
  viewMode = 'iso',
  onToggleViewMode,
}: OfficeWorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarController | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<InteractiveNode | null>(null);
  const [cameraMode, setCameraMode] = useState<'follow' | 'docked'>('follow');
  const dockedTargetRef = useRef<THREE.Vector3 | null>(null);

  // Stage & ViewMode tracking
  const [localStage, setLocalStage] = useState<'plot' | 'company' | 'workspace'>(currentStage);
  const activeStageRef = useRef<'plot' | 'company' | 'workspace'>(currentStage);
  const onStageChangeRef = useRef(onStageChange);
  onStageChangeRef.current = onStageChange;

  const viewModeRef = useRef<'3d' | 'iso'>(viewMode);
  viewModeRef.current = viewMode;

  const isSurveyorActiveRef = useRef(isSurveyorActive);
  isSurveyorActiveRef.current = isSurveyorActive;

  const plotsGroupRef = useRef<THREE.Group | null>(null);
  const companyBuildingGroupRef = useRef<THREE.Group | null>(null);
  const workspaceInteriorGroupRef = useRef<THREE.Group | null>(null);
  const outdoorNodesGroupRef = useRef<THREE.Group | null>(null);
  const [compassAngle, setCompassAngle] = useState(0);
  const lastCompassUpdateTimeRef = useRef(0);
  const lastNearbyNodeIdRef = useRef<string | null>(null);

  // Peer meshes map
  const peerMeshesRef = useRef<Map<string, { group: THREE.Group; nametag: THREE.Sprite }>>(new Map());
  const peersRef = useRef<SpatialPeer[]>(peers);
  peersRef.current = peers;
  const activeZoneIdRef = useRef<string | null>(null);
  const lastPosUpdateTimeRef = useRef<number>(0);

  // Synchronize avatar nametag when user role or display name changes
  useEffect(() => {
    if (avatarRef.current) {
      avatarRef.current.setRole(userRole, displayName);
    }
  }, [userRole, displayName]);

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

  // Master Stage Transition Engine (Plots <-> Company HQ <-> Workspace Interior)
  const transitionStage = useCallback(
    (newStage: 'plot' | 'company' | 'workspace', customCoords?: { x: number; z: number }) => {
      sounds.playDockSound();
      activeStageRef.current = newStage;
      setLocalStage(newStage);
      if (onStageChangeRef.current) {
        onStageChangeRef.current(newStage);
      }

      if (newStage === 'workspace') {
        if (plotsGroupRef.current) plotsGroupRef.current.visible = false;
        if (companyBuildingGroupRef.current) companyBuildingGroupRef.current.visible = false;
        if (outdoorNodesGroupRef.current) outdoorNodesGroupRef.current.visible = false;
        if (workspaceInteriorGroupRef.current) workspaceInteriorGroupRef.current.visible = true;

        populateWorkspaceStations(floor);

        const targetX = customCoords ? customCoords.x : 0;
        const targetZ = customCoords ? customCoords.z : 4;
        if (avatarRef.current) {
          avatarRef.current.teleport(targetX, targetZ);
          avatarRef.current.orbitAngle = Math.PI / 4; // Canonical 45-deg isometric
          avatarRef.current.orbitPitch = 0.62;
          avatarRef.current.zoomDistance = 24.0;
        }
        if (cameraRef.current) {
          const offsetX = Math.sin(Math.PI / 4) * Math.cos(0.62) * 24.0;
          const offsetY = Math.sin(0.62) * 24.0;
          const offsetZ = Math.cos(Math.PI / 4) * Math.cos(0.62) * 24.0;
          cameraRef.current.position.set(targetX + offsetX, offsetY, targetZ + offsetZ);
          cameraRef.current.lookAt(targetX, 1.2, targetZ);
        }
      } else {
        // Outdoor stages: 'plot' or 'company'
        if (plotsGroupRef.current) plotsGroupRef.current.visible = true;
        if (companyBuildingGroupRef.current) companyBuildingGroupRef.current.visible = true;
        if (outdoorNodesGroupRef.current) outdoorNodesGroupRef.current.visible = true;
        if (workspaceInteriorGroupRef.current) workspaceInteriorGroupRef.current.visible = false;

        populateOutdoorStations();

        const targetX = customCoords ? customCoords.x : (newStage === 'company' ? 0 : -24);
        const targetZ = customCoords ? customCoords.z : (newStage === 'company' ? 9.5 : -20);
        if (avatarRef.current) {
          avatarRef.current.teleport(targetX, targetZ);
          avatarRef.current.orbitAngle = Math.PI / 4; // Canonical 45-deg isometric
          avatarRef.current.orbitPitch = 0.62;
          avatarRef.current.zoomDistance = 28.0;
        }
        if (cameraRef.current) {
          const offsetX = Math.sin(Math.PI / 4) * Math.cos(0.62) * 28.0;
          const offsetY = Math.sin(0.62) * 28.0;
          const offsetZ = Math.cos(Math.PI / 4) * Math.cos(0.62) * 28.0;
          cameraRef.current.position.set(targetX + offsetX, offsetY, targetZ + offsetZ);
          cameraRef.current.lookAt(targetX, 1.2, targetZ);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floor]
  );

  useEffect(() => {
    if (currentStage !== activeStageRef.current) {
      transitionStage(currentStage);
    }
  }, [currentStage, transitionStage]);

  // Handle interaction key [E]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyE' && nearbyPrompt) {
        if (nearbyPrompt.id === 'node-portal-company-workspace') {
          transitionStage('workspace', { x: 0, z: 11 });
          return;
        }
        if (nearbyPrompt.id === 'node-portal-exit-plots') {
          transitionStage('company', { x: 0, z: 9.5 });
          return;
        }
        if (nearbyPrompt.id === 'node-campus-directory') {
          sounds.playKeyClick();
          if (onOpenPlotDeed) onOpenPlotDeed();
          return;
        }

        sounds.playDockSound();
        onDockWorkstation(nearbyPrompt);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyPrompt, onDockWorkstation, onOpenPlotDeed, transitionStage]);

  // Handle Teleport Target
  useEffect(() => {
    if (teleportTarget && avatarRef.current) {
      avatarRef.current.teleport(teleportTarget.x, teleportTarget.z);
      if (onTeleportCompleted) {
        onTeleportCompleted();
      }
    }
  }, [teleportTarget, onTeleportCompleted]);

  // Handle Active Emote
  useEffect(() => {
    if (!activeEmote) return;
    const emojiMap: Record<string, string> = {
      wave: '👋',
      heart: '❤️',
      bulb: '💡',
      fire: '🔥',
      thumbs_up: '👍',
      coffee: '☕',
      party: '🎉',
    };
    const emoji = emojiMap[activeEmote.emote] || '👋';
    if (avatarRef.current) {
      avatarRef.current.showEmote(emoji);
    }
  }, [activeEmote]);

  // Helper: Create Coworker Peer Nametag Billboard
  const createPeerNametagSprite = (peer: SpatialPeer) => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const isSpeaking = peer.mediaState.speaking;
      ctx.fillStyle = isSpeaking ? 'rgba(22, 101, 52, 0.95)' : 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(8, 8, 368, 80);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isSpeaking ? '#4ade80' : '#f59e0b';
      ctx.strokeRect(8, 8, 368, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(peer.name, 192, 42);

      ctx.fillStyle = isSpeaking ? '#86efac' : '#94a3b8';
      ctx.font = 'bold 15px monospace';
      const statusText = isSpeaking ? '🎙️ SPEAKING' : peer.role.toUpperCase();
      ctx.fillText(statusText, 192, 70);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.6, 1);
    return sprite;
  };


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
    const screenDisplayMat = new THREE.MeshStandardMaterial({
      color: isEmergency ? 0xef4444 : 0x0284c7,
      emissive: isEmergency ? 0xb91c1c : 0x0284c7,
      emissiveIntensity: 0.82,
      roughness: 0.2,
      metalness: 0.1,
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

  // Helper: Build Full Executive Admin Suite & Workspace (Obsidian Platform, Glass Partitions, Server Column, Master Terminal)
  const buildAdminMasterTerminal = (nodeData: InteractiveNode) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    // 1. Executive Elevated Dais / Floor Platform (Obsidian Stone + Royal Indigo Carpet)
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.35,
      metalness: 0.8,
    });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 5.8), platformMat);
    platform.position.set(0, 0.06, 0);
    platform.receiveShadow = true;
    group.add(platform);

    // Gilded Pure Gold Dais Trim
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const goldTrimFront = new THREE.Mesh(new THREE.BoxGeometry(6.64, 0.14, 0.08), goldMat);
    goldTrimFront.position.set(0, 0.06, 2.9);
    group.add(goldTrimFront);
    const goldTrimBack = new THREE.Mesh(new THREE.BoxGeometry(6.64, 0.14, 0.08), goldMat);
    goldTrimBack.position.set(0, 0.06, -2.9);
    group.add(goldTrimBack);

    // Royal Indigo Velvet Inlay Carpet
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.9,
      metalness: 0.05,
    });
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.02, 5.0), carpetMat);
    carpet.position.set(0, 0.125, 0);
    carpet.receiveShadow = true;
    group.add(carpet);

    // 2. Room Glass Perimeter Partitions & Brass Corner Pillars
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.25,
    });
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });

    // 4 Corner Architectural Pillars
    [[-3.2, -2.8], [3.2, -2.8], [-3.2, 2.8], [3.2, 2.8]].forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), pillarMat);
      pillar.position.set(px, 1.3, pz);
      pillar.castShadow = true;
      group.add(pillar);
    });

    // Back Tinted Glass Partition Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.4, 0.06), glassMat);
    backWall.position.set(0, 1.3, -2.8);
    group.add(backWall);

    // Left & Right Glass Partition Walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 5.4), glassMat);
    leftWall.position.set(-3.2, 1.3, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 5.4), glassMat);
    rightWall.position.set(3.2, 1.3, 0);
    group.add(rightWall);

    // Front Glass Wings with Open Walk-in Archway
    const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.06), glassMat);
    frontLeftWall.position.set(-2.1, 1.3, 2.8);
    group.add(frontLeftWall);

    const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.06), glassMat);
    frontRightWall.position.set(2.1, 1.3, 2.8);
    group.add(frontRightWall);

    // Archway Header Bar
    const headerBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.1), pillarMat);
    headerBar.position.set(0, 2.5, 2.8);
    group.add(headerBar);

    // Executive Workspace Entrance Billboard
    const entranceSign = createFloatingSprite(
      'EXECUTIVE ADMIN WORKSPACE',
      '👑',
      'HIGH-SECURITY ROOT WORKSPACE',
      3.2
    );
    entranceSign.position.set(0, 0, 2.8);
    group.add(entranceSign);

    // 3. Corner Telecom / Central Database Rack Column
    const serverMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 });
    const serverRack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.2, 0.75), serverMat);
    serverRack.position.set(-2.4, 1.2, -2.0);
    serverRack.castShadow = true;
    group.add(serverRack);

    // Flashing Server Status LEDs
    const ledGreen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    ledGreen.position.set(-2.4, 1.7, -1.62);
    group.add(ledGreen);
    const ledBlue = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    ledBlue.position.set(-2.4, 1.5, -1.62);
    group.add(ledBlue);
    const ledGold = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    ledGold.position.set(-2.4, 1.3, -1.62);
    group.add(ledGold);

    // 4. Center Master Terminal Computer Desk
    const deskGeo = new THREE.BoxGeometry(3.2, 0.14, 1.5);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.8,
    });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.95, -0.4);
    desk.castShadow = true;
    group.add(desk);

    // Gilded Pure Gold Trim Corners
    [[-1.55, -1.1], [1.55, -1.1], [-1.55, 0.3], [1.55, 0.3]].forEach(([bx, bz]) => {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), goldMat);
      corner.position.set(bx, 0.95, bz);
      group.add(corner);
    });

    // Polished Gold Foundation Desk Legs
    [[-1.4, -1.0], [1.4, -1.0], [-1.4, 0.2], [1.4, 0.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.16), goldMat);
      leg.position.set(lx, 0.475, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // 5. Triple Curved Display Master Monitors
    // Center Master Monitor
    const centerScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.85, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.3 })
    );
    centerScreen.position.set(0, 1.6, -0.6);
    centerScreen.castShadow = true;
    group.add(centerScreen);

    const centerDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.52, 0.78),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    centerDisplay.position.set(0, 1.6, -0.56);
    group.add(centerDisplay);

    // Angled Side Monitor Left
    const leftScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.85, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x020617 })
    );
    leftScreen.position.set(-1.15, 1.6, -0.45);
    leftScreen.rotation.y = 0.38;
    group.add(leftScreen);

    const leftDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 0.78),
      new THREE.MeshBasicMaterial({ color: 0x0369a1 })
    );
    leftDisplay.position.set(-1.13, 1.6, -0.42);
    leftDisplay.rotation.y = 0.38;
    group.add(leftDisplay);

    // Angled Side Monitor Right
    const rightScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.85, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x020617 })
    );
    rightScreen.position.set(1.15, 1.6, -0.45);
    rightScreen.rotation.y = -0.38;
    group.add(rightScreen);

    const rightDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 0.78),
      new THREE.MeshBasicMaterial({ color: 0x0369a1 })
    );
    rightDisplay.position.set(1.13, 1.6, -0.42);
    rightDisplay.rotation.y = -0.38;
    group.add(rightDisplay);

    // Keyboard with Gold Accent Plate
    const kb = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.03, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
    );
    kb.position.set(0, 1.03, -0.15);
    group.add(kb);

    // 6. Executive Ergonomic Chair (Black Leather + Gold Frame)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), chairMat);
    seat.position.set(0, 0.6, 0.45);
    group.add(seat);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.1), chairMat);
    backrest.position.set(0, 1.15, 0.85);
    group.add(backrest);

    // Floating Interactive Admin Computer Prompt Billboard
    const adminSprite = createFloatingSprite(
      'Executive Admin Console',
      '👑',
      'USER MANAGEMENT & RBAC [PRESS E]',
      2.8
    );
    adminSprite.position.set(0, 0, -0.4);
    group.add(adminSprite);

    return group;
  };

  // Helper: Build Portal Gateway Arch (Cyan for Entering Company, Amber for Exiting to Plots)
  const buildPortalMesh = (nodeData: InteractiveNode, isExit = false) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    const frameMat = new THREE.MeshStandardMaterial({
      color: isExit ? 0xd97706 : 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    });
    // Arch Left
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), frameMat);
    postL.position.set(-1.5, 1.7, 0);
    group.add(postL);
    // Arch Right
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), frameMat);
    postR.position.set(1.5, 1.7, 0);
    group.add(postR);
    // Arch Header
    const header = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 0.28), frameMat);
    header.position.set(0, 3.3, 0);
    group.add(header);

    // Glowing translucent portal energy curtain
    const glowMat = new THREE.MeshBasicMaterial({
      color: isExit ? 0xf59e0b : 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.1), glowMat);
    curtain.position.set(0, 1.6, 0);
    group.add(curtain);

    // Floor threshold light strip
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.08, 0.9),
      new THREE.MeshStandardMaterial({
        color: isExit ? 0xf59e0b : 0x0ea5e9,
        emissive: isExit ? 0xb45309 : 0x0284c7,
        emissiveIntensity: 0.8,
      })
    );
    strip.position.set(0, 0.04, 0);
    group.add(strip);

    const promptText = isExit ? 'CLICK OR [E] TO EXIT TO PLOTS' : 'CLICK OR [E] TO ENTER WORKSPACE';
    const icon = isExit ? '🚪' : '🏢';
    const sprite = createFloatingSprite(nodeData.name, icon, promptText, 3.6, false);
    group.add(sprite);

    return group;
  };

  // Helper: Build Campus Directory Kiosk Mesh
  const buildDirectoryNodeMesh = (nodeData: InteractiveNode) => {
    const group = new THREE.Group();
    group.position.set(nodeData.position.x, 0, nodeData.position.z);
    group.userData = { node: nodeData };

    const sprite = createFloatingSprite(nodeData.name, '📋', 'CLICK OR [E] TO VIEW DEEDS', 3.0, false);
    group.add(sprite);
    return group;
  };

  // Helper: Build Outdoor Interactive Nodes (Company Entrance Archway, Campus Directory Board)
  const populateOutdoorStations = () => {
    if (!outdoorNodesGroupRef.current) return;
    const group = outdoorNodesGroupRef.current;
    group.clear();
    nodeMeshesRef.current.clear();

    const outdoorNodes: InteractiveNode[] = [
      {
        id: 'node-portal-company-workspace',
        name: 'Company Headquarters Entrance',
        type: 'portal',
        position: { x: 0, y: 1, z: 7.0 },
        description: 'Enter into Kynetra Company Headquarters and Engineering Workspace.',
        activeSessionCount: 0,
      },
      {
        id: 'node-campus-directory',
        name: 'Campus Directory & Plot Deeds',
        type: 'whiteboard',
        position: { x: -5, y: 1, z: 7.5 },
        description: 'View land parcel deeds, zoning metrics, and campus estate registry.',
        activeSessionCount: 0,
      },
    ];

    stationsRef.current = outdoorNodes;
    outdoorNodes.forEach((node) => {
      let nodeMesh: THREE.Group;
      if (node.id === 'node-portal-company-workspace') {
        nodeMesh = buildPortalMesh(node, false);
      } else {
        nodeMesh = buildDirectoryNodeMesh(node);
      }
      group.add(nodeMesh);
      nodeMeshesRef.current.set(node.id, nodeMesh);
    });
  };

  // Helper: Build Interior Workspace Stations (Desks, Server Racks, Aria Pod, Battle Pods, Exit Door)
  const populateWorkspaceStations = (currentFloor: InnovationTowerFloor | null) => {
    if (!stationsGroupRef.current) return;
    const group = stationsGroupRef.current;
    group.clear();
    nodeMeshesRef.current.clear();

    const interiorSpecialNodes: InteractiveNode[] = [
      {
        id: 'node-portal-exit-plots',
        name: 'Exit to Campus Plots & Plaza',
        type: 'portal',
        position: { x: 0, y: 1, z: 13.0 },
        description: 'Step outside into the outdoor plots, municipal roads, and campus plaza.',
        activeSessionCount: 0,
      },
      {
        id: 'node-reception-aria',
        name: 'Aria (AI Concierge Pod)',
        type: 'receptionist_npc',
        position: { x: 0, y: 1, z: 6.0 },
        description: 'AI guide and architectural mentor.',
        activeSessionCount: 0,
      },
      {
        id: 'node-dev-desk-1',
        name: 'Desk 01: Full-Stack IDE Lab',
        type: 'terminal',
        position: { x: -8, y: 1, z: 2.0 },
        description: 'TypeScript & Next.js development workstation with code editor and terminal.',
        activeSessionCount: 1,
      },
      {
        id: 'node-sre-noc',
        name: 'Desk 02: Cloud & SRE Incident NOC',
        type: 'terminal',
        position: { x: 8, y: 1, z: 2.0 },
        description: 'NOC telemetry console with Kubernetes server racks.',
        activeSessionCount: 0,
      },
      {
        id: 'node-battle-pod-alpha',
        name: 'Battle Pod Alpha (Multiplayer)',
        type: 'coding_pod',
        position: { x: -8, y: 1, z: -5.0 },
        description: 'Competitive coding station with live unit testing harness.',
        activeSessionCount: 0,
      },
      {
        id: 'node-battle-pod-beta',
        name: 'Battle Pod Beta (Multiplayer)',
        type: 'coding_pod',
        position: { x: 8, y: 1, z: -5.0 },
        description: 'High-stakes algorithmic challenge pod.',
        activeSessionCount: 0,
      },
      {
        id: 'node-whiteboard',
        name: 'System Architecture Whiteboard',
        type: 'whiteboard',
        position: { x: -10, y: 1, z: -9.0 },
        description: 'Collaborative architectural whiteboard.',
        activeSessionCount: 0,
      },
      {
        id: 'node-admin-console',
        name: 'Executive Admin Master Terminal',
        type: 'terminal',
        position: { x: 10, y: 1, z: -9.0 },
        description: 'Master RBAC console and user administration terminal for platform administrators.',
        activeSessionCount: 1,
      },
    ];

    const additionalFloorNodes = (currentFloor?.nodes || []).filter(
      (n) => !interiorSpecialNodes.some((sn) => sn.id === n.id)
    );

    const stationsToRender: InteractiveNode[] = [...interiorSpecialNodes, ...additionalFloorNodes];
    stationsRef.current = stationsToRender;

    stationsToRender.forEach((node) => {
      let nodeMesh: THREE.Group;
      if (node.id === 'node-portal-exit-plots') {
        nodeMesh = buildPortalMesh(node, true);
      } else if (node.id === 'node-admin-console') {
        nodeMesh = buildAdminMasterTerminal(node);
      } else if (node.type === 'receptionist_npc') {
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
    const isWorkspaceInit = currentStage === 'workspace';
    const spawnX = isWorkspaceInit ? 0 : (currentStage === 'company' ? 0 : -24);
    const spawnZ = isWorkspaceInit ? 4 : (currentStage === 'company' ? 9.5 : -20);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x60a5fa); // Classic vibrant Minecraft daylight blue
    scene.fog = new THREE.Fog(0x93c5fd, 48, 120); // Soft horizon daylight mist

    // 2. Camera Setup (True 45-degree Isometric Perspective Camera)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 250);
    const initDist = isWorkspaceInit ? 24.0 : 28.0;
    const initPitch = 0.62;
    const initAngle = Math.PI / 4;
    const initX = spawnX + Math.sin(initAngle) * Math.cos(initPitch) * initDist;
    const initY = Math.sin(initPitch) * initDist;
    const initZ = spawnZ + Math.cos(initAngle) * Math.cos(initPitch) * initDist;
    camera.position.set(initX, initY, initZ);
    camera.lookAt(spawnX, 1.2, spawnZ);
    cameraRef.current = camera;

    // 3. Renderer Setup (Minecraft RTX Shader Pack Level Aesthetics)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.replaceChildren(renderer.domElement);

    // 4. Warm Daylight Lighting (Morning Golden Sun + Sky Hemisphere Bounce)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x86efac, 1.05);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    sunLight.position.set(22, 34, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 75;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.8);
    fillLight.position.set(-18, 16, -14);
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

    // 5B. Outdoor Plots & Road Network (130m x 130m Estate layout matching reference image)
    const plotsGroup = buildPlotsAndRoads(worldPlots, isSurveyorActive, (p) => {
      if (onOpenPlotDeed) onOpenPlotDeed(p);
    });
    scene.add(plotsGroup);
    plotsGroupRef.current = plotsGroup;

    // 5C. Corporate Company Headquarters Building (Teal walls, angled blue shed roof, facade, entrance)
    const companyHqGroup = buildCompanyBuilding();
    scene.add(companyHqGroup);
    companyBuildingGroupRef.current = companyHqGroup;

    // 6. Corporate Workspace Interior Container Group
    const workspaceInteriorGroup = new THREE.Group();
    workspaceInteriorGroup.name = 'workspace_interior_group';
    workspaceInteriorGroupRef.current = workspaceInteriorGroup;
    scene.add(workspaceInteriorGroup);

    // 6B. Outdoor Special Nodes Group
    const outdoorNodesGroup = new THREE.Group();
    outdoorNodesGroup.name = 'outdoor_nodes_group';
    outdoorNodesGroupRef.current = outdoorNodesGroup;
    scene.add(outdoorNodesGroup);

    // Warm Oak Plank Floor (Workspace Interior)
    const roomSize = 36;
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xa0714f, // Warm Oak Planks
      roughness: 0.65,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0.05, 0);
    floorMesh.receiveShadow = true;
    workspaceInteriorGroup.add(floorMesh);

    // Dark Spruce Divider Grid
    const grid = new THREE.GridHelper(roomSize, 36, 0x582f0e, 0x7f5539);
    grid.position.set(0, 0.06, 0);
    workspaceInteriorGroup.add(grid);

    // Perimeter Stone Brick Curb
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const northCurb = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 0.25, 0.4), curbMat);
    northCurb.position.set(0, 0.125, -roomSize / 2 + 0.2);
    workspaceInteriorGroup.add(northCurb);

    // Woven Wool Area Rugs (Lapis Lazuli, Terracotta, Emerald)
    const createWoolRug = (x: number, z: number, w: number, d: number, color: number) => {
      const rugGeo = new THREE.PlaneGeometry(w, d);
      const rugMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      const rug = new THREE.Mesh(rugGeo, rugMat);
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(x, 0.07, z);
      rug.receiveShadow = true;
      workspaceInteriorGroup.add(rug);
    };
    createWoolRug(-8, 2, 6.5, 5.5, 0x1d4ed8); // Lapis Blue Wool Rug (Dev Bay)
    createWoolRug(8, 2, 6.5, 5.5, 0xd97706);  // Terracotta Orange Wool Rug (SRE Bay)
    createWoolRug(0, 6, 8.5, 5.5, 0x0284c7);  // Cyan Reception Rug
    createWoolRug(0, -5, 10.5, 6.5, 0x15803d); // Emerald Green Coding Arena Rug

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
      workspaceInteriorGroup.add(win);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.2, 0.2), frameMat);
      frame.position.set(wx, 7.05, -roomSize / 2 + 0.1);
      workspaceInteriorGroup.add(frame);
    }

    // Modern Perimeter Glass Walls for West, East, and South Entrance
    const wallGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.3,
    });
    const wallFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    // West Wall
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.0, roomSize), wallGlassMat);
    westWall.position.set(-roomSize / 2, 2.5, 0);
    workspaceInteriorGroup.add(westWall);

    // East Wall
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.0, roomSize), wallGlassMat);
    eastWall.position.set(roomSize / 2, 2.5, 0);
    workspaceInteriorGroup.add(eastWall);

    // South Entrance Wall (Divided into Left and Right sections leaving central doorway at x: [-2.5, 2.5])
    const southWallL = new THREE.Mesh(new THREE.BoxGeometry(15.5, 5.0, 0.2), wallGlassMat);
    southWallL.position.set(-10.25, 2.5, 14);
    workspaceInteriorGroup.add(southWallL);

    const southWallR = new THREE.Mesh(new THREE.BoxGeometry(15.5, 5.0, 0.2), wallGlassMat);
    southWallR.position.set(10.25, 2.5, 14);
    workspaceInteriorGroup.add(southWallR);

    // Doorway Header over the entrance opening
    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.2, 0.25), wallFrameMat);
    doorHeader.position.set(0, 4.4, 14);
    workspaceInteriorGroup.add(doorHeader);

    // Ambient Office Ceiling Lighting
    const ceilingLights = [
      [-6, 4.8, 3],
      [6, 4.8, 3],
      [-6, 4.8, -5],
      [6, 4.8, -5],
      [0, 4.8, 6],
    ];
    ceilingLights.forEach(([lx, ly, lz]) => {
      const pLight = new THREE.PointLight(0xfffbeb, 1.2, 22);
      pLight.position.set(lx, ly, lz);
      workspaceInteriorGroup.add(pLight);
    });

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
    workspaceInteriorGroup.add(terrainGroup);

    // 8. Student Break Lounge (Birch Sofa + Potted Oak Bushes + Coffee Brewer)
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(-1, 0, -12);

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

    const loungeSprite = createFloatingSprite('Cyber Cafe & Lounge', '☕', 'CASUAL PROXIMITY', 2.4);
    loungeGroup.add(loungeSprite);
    workspaceInteriorGroup.add(loungeGroup);

    // 8B. WorkAdventure Spatial Zones (Meeting Agora & Deep Focus Pod)
    const zonesGroup = new THREE.Group();

    // 1. All-Hands Agora (Conference Zone)
    const agoraGeo = new THREE.BoxGeometry(7, 0.08, 7);
    const agoraMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.5,
    });
    const agoraPlatform = new THREE.Mesh(agoraGeo, agoraMat);
    agoraPlatform.position.set(-7.5, 0.04, -6.5);
    zonesGroup.add(agoraPlatform);

    // Agora Glowing Wireframe Rim
    const agoraRim = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.14, 7.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    );
    agoraRim.position.set(-7.5, 0.08, -6.5);
    zonesGroup.add(agoraRim);

    // Round Conference Table
    const confTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 })
    );
    confTable.position.set(-7.5, 0.95, -6.5);
    confTable.castShadow = true;
    zonesGroup.add(confTable);

    // Conference Wall Screen
    const confScreen = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.8, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.5 })
    );
    confScreen.position.set(-7.5, 2.4, -9.8);
    zonesGroup.add(confScreen);

    const agoraSprite = createFloatingSprite('All-Hands Agora', '🏛️', 'MEETING ROOM (AUTO VIDEO)', 3.2);
    agoraSprite.position.set(-7.5, 3.5, -6.5);
    zonesGroup.add(agoraSprite);

    // 2. Deep Focus Acoustic Pod (Silent Zone)
    const focusGeo = new THREE.BoxGeometry(6, 0.08, 6);
    const focusMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
    });
    const focusPlatform = new THREE.Mesh(focusGeo, focusMat);
    focusPlatform.position.set(7.0, 0.04, -7.0);
    zonesGroup.add(focusPlatform);

    const focusRim = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.14, 6.2),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true })
    );
    focusRim.position.set(7.0, 0.08, -7.0);
    zonesGroup.add(focusRim);

    const podGlassMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
    });
    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.6, 0.1), podGlassMat);

    glassWall.position.set(7.0, 1.3, -9.8);
    zonesGroup.add(glassWall);

    const focusSprite = createFloatingSprite('Deep Focus Pod', '🤫', 'SILENT ZONE (CALLS MUTED)', 3.0);
    focusSprite.position.set(7.0, 3.2, -7.0);
    zonesGroup.add(focusSprite);

    workspaceInteriorGroup.add(zonesGroup);

    // 9. Stations Group (Workspace Desks & Terminals)
    const stationsGroup = new THREE.Group();
    stationsGroupRef.current = stationsGroup;
    workspaceInteriorGroup.add(stationsGroup);

    // Set Initial Group Visibility based on Current Stage
    workspaceInteriorGroup.visible = isWorkspaceInit;
    plotsGroup.visible = !isWorkspaceInit;
    companyHqGroup.visible = !isWorkspaceInit;
    outdoorNodesGroup.visible = !isWorkspaceInit;

    // Initial station population
    if (isWorkspaceInit) {
      populateWorkspaceStations(floor);
    } else {
      populateOutdoorStations();
    }

    // 10. Student Avatar Controller (Minecraft Voxel Character)
    const avatar = new AvatarController(spawnX, spawnZ);
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
      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // Drift voxel clouds slowly across the sky
      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.children.forEach((cloud) => {
          cloud.position.x += delta * 0.45;
          if (cloud.position.x > 38) cloud.position.x = -38;
        });
      }

      // Update Student Avatar & Proximity with dynamic boundaries and physical colliders
      const isWorkspace = activeStageRef.current === 'workspace';

      // Strict Stage Visibility Isolation Guarantee: Eliminate any chance of roads/office overlapping
      if (plotsGroupRef.current && plotsGroupRef.current.visible !== !isWorkspace) {
        plotsGroupRef.current.visible = !isWorkspace;
      }
      if (companyBuildingGroupRef.current && companyBuildingGroupRef.current.visible !== !isWorkspace) {
        companyBuildingGroupRef.current.visible = !isWorkspace;
      }
      if (outdoorNodesGroupRef.current && outdoorNodesGroupRef.current.visible !== !isWorkspace) {
        outdoorNodesGroupRef.current.visible = !isWorkspace;
      }
      if (workspaceInteriorGroupRef.current && workspaceInteriorGroupRef.current.visible !== isWorkspace) {
        workspaceInteriorGroupRef.current.visible = isWorkspace;
      }

      const currentBounds = isWorkspace ? 16.8 : 62.0;
      const activeColliders = isWorkspace ? WORKSPACE_COLLIDERS : OUTDOOR_COLLIDERS;
      const { nearbyNode } = avatar.update(delta, stationsRef.current, currentBounds, activeColliders);
      if (nearbyNode?.id !== lastNearbyNodeIdRef.current) {
        lastNearbyNodeIdRef.current = nearbyNode?.id || null;
        setNearbyPrompt(nearbyNode);
      }

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

      // Smooth Camera Positioning (Dedicated Isometric Camera with Player Tracking)
      if (cameraModeRef.current === 'docked' && dockedTargetRef.current) {
        camera.position.lerp(dockedTargetRef.current, delta * 5);
        camera.lookAt(dockedTargetRef.current.x, 1.4, dockedTargetRef.current.z);
      } else {
        // True 45-degree Isometric View matching reference artwork
        // Elevated at 35.5 degrees pitch, 45 degrees horizontal azimuth, smoothly tracking avatar
        const currentDist = avatar.zoomDistance || 28.0;
        const currentPitch = Math.max(0.48, Math.min(0.95, avatar.orbitPitch));
        const currentAngle = avatar.orbitAngle;

        const offsetX = Math.sin(currentAngle) * Math.cos(currentPitch) * currentDist;
        const offsetY = Math.sin(currentPitch) * currentDist;
        const offsetZ = Math.cos(currentAngle) * Math.cos(currentPitch) * currentDist;

        const targetCamPos = new THREE.Vector3(
          avatar.position.x + offsetX,
          avatar.position.y + offsetY,
          avatar.position.z + offsetZ
        );

        camera.position.lerp(targetCamPos, delta * 8);
        camera.lookAt(avatar.position.x, avatar.position.y + 1.2, avatar.position.z);
      }

      // Stage Detection & Doorway Triggers
      if (activeStageRef.current === 'workspace') {
        // Stepping past doorway at the south end of the office exits to Company Plaza
        if (avatar.position.z > 13.0 && Math.abs(avatar.position.x) < 2.8) {
          transitionStage('company', { x: 0, z: 6.0 });
        }
      } else {
        // Outdoors
        const isAtEntranceArch = Math.hypot(avatar.position.x, avatar.position.z - 7.0) < 1.8;
        const isAtBuildingDoor = Math.abs(avatar.position.x) < 2.0 && avatar.position.z <= 3.8 && avatar.position.z >= 1.5;

        if (isAtEntranceArch || isAtBuildingDoor) {
          // Walked right into the front doorway!
          transitionStage('workspace', { x: 0, z: 11 });
        } else if (Math.hypot(avatar.position.x, avatar.position.z - 4.0) < 7.5) {
          if (activeStageRef.current !== 'company') {
            activeStageRef.current = 'company';
            setLocalStage('company');
            if (onStageChangeRef.current) onStageChangeRef.current('company');
          }
        } else {
          if (activeStageRef.current !== 'plot') {
            activeStageRef.current = 'plot';
            setLocalStage('plot');
            if (onStageChangeRef.current) onStageChangeRef.current('plot');
          }
        }
      }

      // Compass needle update (throttled to 200ms with deadband to prevent unnecessary React re-renders)
      if (currentTime - lastCompassUpdateTimeRef.current > 200) {
        lastCompassUpdateTimeRef.current = currentTime;
        setCompassAngle((prev) => (Math.abs(prev - avatar.orbitAngle) > 0.04 ? avatar.orbitAngle : prev));
      }

      // Spatial Position & Proximity update callback (throttled to 12Hz to eliminate CPU overhead)
      if (onUpdatePosition && currentTime - lastPosUpdateTimeRef.current > 80) {
        lastPosUpdateTimeRef.current = currentTime;
        onUpdatePosition(avatar.position.x, avatar.position.y, avatar.position.z, avatar.orbitAngle);
      }

      // Zone Boundary Detection
      let detectedZone: SpatialZone | null = null;
      for (const z of OFFICE_SPATIAL_ZONES) {
        if (
          avatar.position.x >= z.bounds.minX &&
          avatar.position.x <= z.bounds.maxX &&
          avatar.position.z >= z.bounds.minZ &&
          avatar.position.z <= z.bounds.maxZ
        ) {
          detectedZone = z;
          break;
        }
      }

      if (detectedZone?.id !== activeZoneIdRef.current) {
        activeZoneIdRef.current = detectedZone?.id || null;
        if (onZoneChange) {
          onZoneChange(detectedZone);
        }
      }

      // Synchronize remote peer 3D avatars
      const currentPeers = peersRef.current;
      const seenPeerIds = new Set<string>();

      currentPeers.forEach((peer) => {
        if (
          peer.name.includes('(You)') ||
          (localPeerId && peer.peerId === localPeerId) ||
          (localUserId && peer.userId === localUserId)
        ) {
          return;
        }
        seenPeerIds.add(peer.peerId);

        let peerData = peerMeshesRef.current.get(peer.peerId);
        if (!peerData) {
          const group = new THREE.Group();
          group.position.set(peer.position.x, 0, peer.position.z);

          const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0a98b, roughness: 0.8 });
          const hexCol = peer.avatarColor ? parseInt(peer.avatarColor.replace('#', '0x'), 16) : 0x0284c7;
          const shirtMat = new THREE.MeshStandardMaterial({ color: hexCol, roughness: 0.7 });
          const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

          const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), shirtMat);
          torso.position.y = 1.1;
          torso.castShadow = true;
          group.add(torso);

          const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), skinMat);
          head.position.y = 1.85;
          head.castShadow = true;
          group.add(head);

          const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.3), pantsMat);
          legs.position.y = 0.475;
          legs.castShadow = true;
          group.add(legs);

          const nametag = createPeerNametagSprite(peer);
          nametag.position.y = 2.7;
          group.add(nametag);

          scene.add(group);
          peerData = { group, nametag };
          peerMeshesRef.current.set(peer.peerId, peerData);
        }

        // Interpolate position
        const targetPos = new THREE.Vector3(peer.position.x, 0, peer.position.z);
        peerData.group.position.lerp(targetPos, delta * 6);
      });

      // Cleanup departed peers
      peerMeshesRef.current.forEach((data, pId) => {
        if (!seenPeerIds.has(pId)) {
          scene.remove(data.group);
          peerMeshesRef.current.delete(pId);
        }
      });

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
      if (activeStageRef.current === 'workspace') {
        populateWorkspaceStations(floor);
      } else {
        populateOutdoorStations();
      }
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
    if (activeStageRef.current === 'workspace') {
      populateWorkspaceStations(floor);
    } else {
      populateOutdoorStations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncidentActive]);

  // Rebuild plots when surveyor mode or plot list changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (plotsGroupRef.current) {
      sceneRef.current.remove(plotsGroupRef.current);
    }
    const newPlotsGroup = buildPlotsAndRoads(worldPlots, isSurveyorActive, (p) => {
      if (onOpenPlotDeed) onOpenPlotDeed(p);
    });
    sceneRef.current.add(newPlotsGroup);
    plotsGroupRef.current = newPlotsGroup;
  }, [worldPlots, isSurveyorActive, onOpenPlotDeed]);

  // Fast Travel / Stage Teleport Handler
  const handleTeleportStage = (targetStage: 'plot' | 'company' | 'workspace') => {
    transitionStage(targetStage);
  };

  // Handle Canvas Click to Select, Dock, or Enter Company / Plot
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      // 1. Check for Plot click (opens Plot Land Deed)
      let plotObj: THREE.Object3D | null = hit.object;
      while (plotObj && !plotObj.userData?.plotData) {
        plotObj = plotObj.parent;
      }
      if (plotObj && plotObj.userData?.plotData) {
        const clickedPlot = plotObj.userData.plotData as WorldPlot;
        sounds.playKeyClick();
        if (onOpenPlotDeed) {
          onOpenPlotDeed(clickedPlot);
        }
        return;
      }

      // 2. Check for Station / Portal node click
      let current: THREE.Object3D | null = hit.object;
      while (current && !current.userData?.node) {
        current = current.parent;
      }
      if (current && current.userData?.node) {
        const clickedNode: InteractiveNode = current.userData.node;
        sounds.playKeyClick();
        onSelectNode(clickedNode);

        if (clickedNode.id === 'node-portal-company-workspace') {
          transitionStage('workspace', { x: 0, z: 4 });
          return;
        }
        if (clickedNode.id === 'node-portal-exit-plots') {
          transitionStage('company', { x: 0, z: 9.5 });
          return;
        }
        if (clickedNode.id === 'node-campus-directory') {
          if (onOpenPlotDeed) onOpenPlotDeed();
          return;
        }

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
          <span>
            {localStage === 'workspace'
              ? (floor?.name ? `WORKSPACE FLOOR: ${floor.name.toUpperCase()}` : 'COMPANY WORKSPACE FLOOR')
              : localStage === 'company'
              ? 'CAMPUS PLAZA: KYNETRA HEADQUARTERS'
              : 'OUTDOOR ESTATE: LAND PARCELS & PLOTS'}
          </span>
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
          CONTROLS: WASD to Walk • Drag to Orbit • Scroll to Zoom
        </div>
      </div>

      {/* Spatial Progression Stage Breadcrumb Bar (Plots -> Company -> Workspace) */}
      <div
        style={{
          position: 'absolute',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '30px',
          padding: '5px 12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Step 1: Plots */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            transitionStage('plot', { x: -24, z: -20 });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '20px',
            border: localStage === 'plot' ? '2px solid #38bdf8' : '1px solid transparent',
            background: localStage === 'plot' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: localStage === 'plot' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="1. Spawn at Land Plot (Outdoor Parcels)"
        >
          <span>📍</span>
          <span>1. PLOTS</span>
        </button>

        <span style={{ color: '#475569', fontSize: '11px' }}>➔</span>

        {/* Step 2: Company */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            transitionStage('company', { x: 0, z: 9.5 });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '20px',
            border: localStage === 'company' ? '2px solid #0d9488' : '1px solid transparent',
            background: localStage === 'company' ? 'rgba(13, 148, 136, 0.25)' : 'transparent',
            color: localStage === 'company' ? '#2dd4bf' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="2. Approach Company Campus Headquarters"
        >
          <span>🏢</span>
          <span>2. COMPANY HQ</span>
        </button>

        <span style={{ color: '#475569', fontSize: '11px' }}>➔</span>

        {/* Step 3: Workspace */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            transitionStage('workspace', { x: 0, z: 11 });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '20px',
            border: localStage === 'workspace' ? '2px solid #f59e0b' : '1px solid transparent',
            background: localStage === 'workspace' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
            color: localStage === 'workspace' ? '#fbbf24' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="3. Enter Interior Engineering Workspace"
        >
          <span>💻</span>
          <span>3. WORKSPACE</span>
        </button>
      </div>

      {/* Right Sidebar Toolbar (from Reference Image: 2D/3D, Compass, Tape Measure, Plot Deed) */}
      <div
        style={{
          position: 'absolute',
          top: '72px',
          right: '18px',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(24, 30, 42, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '8px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* 2D / 3D Isometric View Mode Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            sounds.playKeyClick();
            if (onToggleViewMode) onToggleViewMode();
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: viewMode === 'iso' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
            border: viewMode === 'iso' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
            color: viewMode === 'iso' ? '#38bdf8' : '#e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={viewMode === 'iso' ? 'Switch to 3D Follow Camera' : 'Switch to 2D Isometric Camera'}
        >
          <span style={{ fontSize: '18px' }}>🧊</span>
          <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {viewMode === 'iso' ? '2D ISO' : '3D CAM'}
          </span>
        </button>

        {/* Compass Rose (North Aligner) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            sounds.playKeyClick();
            if (avatarRef.current) {
              avatarRef.current.orbitAngle = 0;
              avatarRef.current.orbitPitch = 0.42;
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
          title="Align View to True North (N)"
        >
          <svg width="24" height="24" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#64748b" strokeWidth="2" />
            <g transform={`rotate(${(-compassAngle * 180) / Math.PI}, 18, 18)`}>
              <polygon points="18,4 21,18 18,15 15,18" fill="#ef4444" />
              <polygon points="18,32 21,18 18,15 15,18" fill="#94a3b8" />
              <circle cx="18" cy="18" r="2.5" fill="#f8fafc" />
            </g>
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px', color: '#fbbf24' }}>
            NORTH
          </span>
        </button>

        {/* Plot Surveyor / Measurement Tool */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            sounds.playKeyClick();
            if (onToggleSurveyor) onToggleSurveyor();
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: isSurveyorActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
            border: isSurveyorActive ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
            color: isSurveyorActive ? '#10b981' : '#e2e8f0',
            cursor: 'pointer',
          }}
          title="Toggle Plot Dimensions & Area Surveyor Metrics"
        >
          <span style={{ fontSize: '18px' }}>📏</span>
          <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            SURVEY
          </span>
        </button>

        {/* Plot Deed & Ownership Certificate Document */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            sounds.playKeyClick();
            if (onOpenPlotDeed) onOpenPlotDeed();
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.18)',
            border: '1px solid #f59e0b',
            color: '#fbbf24',
            cursor: 'pointer',
          }}
          title="Inspect Land Parcel Deeds & Title Certificate"
        >
          <span style={{ fontSize: '18px' }}>📜</span>
          <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            DEED
          </span>
        </button>
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
          <span style={{ fontSize: '20px' }}>
            {nearbyPrompt.id === 'node-portal-company-workspace'
              ? '🏢'
              : nearbyPrompt.id === 'node-portal-exit-plots'
              ? '🚪'
              : nearbyPrompt.id === 'node-campus-directory'
              ? '📋'
              : '⚡'}
          </span>
          <div>
            <span style={{ fontSize: '14px', color: '#fbbf24' }}>{nearbyPrompt.name}</span>
            <div style={{ fontSize: '11px', color: isIncidentActive ? '#fee2e2' : '#cbd5e1', fontWeight: 500 }}>
              {nearbyPrompt.id === 'node-portal-company-workspace'
                ? 'Enter into the company headquarters interior engineering workspace'
                : nearbyPrompt.id === 'node-portal-exit-plots'
                ? 'Step outside into the outdoor plots, municipal roads, and campus plaza'
                : nearbyPrompt.id === 'node-campus-directory'
                ? 'Review cadastral land plots, parcel owners, and cryptographic deeds'
                : isIncidentActive
                ? '🚨 Active SRE Incident detected at this station'
                : 'Workstation ready for interactive session'}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              sounds.playDockSound();
              if (nearbyPrompt.id === 'node-portal-company-workspace') {
                transitionStage('workspace', { x: 0, z: 11 });
                return;
              }
              if (nearbyPrompt.id === 'node-portal-exit-plots') {
                transitionStage('company', { x: 0, z: 9.5 });
                return;
              }
              if (nearbyPrompt.id === 'node-campus-directory') {
                if (onOpenPlotDeed) onOpenPlotDeed();
                return;
              }
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
            {nearbyPrompt.id === 'node-portal-company-workspace'
              ? 'Enter Workspace [E]'
              : nearbyPrompt.id === 'node-portal-exit-plots'
              ? 'Exit to Plots [E]'
              : nearbyPrompt.id === 'node-campus-directory'
              ? 'View Deeds [E]'
              : 'Press [E] to Dock'}
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
