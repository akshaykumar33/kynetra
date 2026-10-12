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
import { ValorantEnvironment } from './ValorantEnvironment';

const OFFICE_SPATIAL_ZONES: SpatialZone[] = [
  {
    id: 'zone-admin-suite',
    name: 'Executive Admin Workspace',
    type: 'workstation',
    color: '#ff4655',
    description: 'High-clearance executive workspace with user management & RBAC master terminal.',
    bounds: { minX: 3.5, maxX: 10.5, minZ: 5.0, maxZ: 11.5 },
  },
  {
    id: 'zone-all-hands',
    name: 'All-Hands Agora (Conference)',
    type: 'meeting',
    color: '#00f5d4',
    description: 'Collaborative meeting room. All occupants share an open video conference.',
    bounds: { minX: -11, maxX: -4, minZ: -10, maxZ: -3 },
  },
  {
    id: 'zone-focus-pod',
    name: 'Deep Focus Acoustic Pod',
    type: 'silent',
    color: '#a855f7',
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
  currentStage = 'workspace',
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

  // Stage & ViewMode tracking
  const [localStage, setLocalStage] = useState<'plot' | 'company' | 'workspace'>(currentStage);
  const activeStageRef = useRef<'plot' | 'company' | 'workspace'>(currentStage);
  const onStageChangeRef = useRef(onStageChange);
  onStageChangeRef.current = onStageChange;

  const plotsGroupRef = useRef<THREE.Group | null>(null);
  const companyBuildingGroupRef = useRef<THREE.Group | null>(null);
  const workspaceGroupRef = useRef<THREE.Group | null>(null);
  const stationsGroupRef = useRef<THREE.Group | null>(null);
  const ariaHologramRef = useRef<THREE.Group | null>(null);
  const serverBladesRef = useRef<THREE.Mesh[]>([]);

  const [compassAngle, setCompassAngle] = useState(0);

  // Peer meshes map
  const peerMeshesRef = useRef<Map<string, { group: THREE.Group; nametag: THREE.Sprite }>>(new Map());
  const peersRef = useRef<SpatialPeer[]>(peers);
  peersRef.current = peers;
  const activeZoneIdRef = useRef<string | null>(null);
  const lastPosUpdateTimeRef = useRef<number>(0);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stationsRef = useRef<InteractiveNode[]>([]);
  const alarmLightsRef = useRef<THREE.PointLight[]>([]);

  // Raycasting
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Synchronize avatar role nametag
  useEffect(() => {
    if (avatarRef.current) {
      avatarRef.current.setRole(userRole, displayName);
    }
  }, [userRole, displayName]);

  /**
   * Populates Tactical Interactive Nodes for the Current Stage
   */
  const populateStations = useCallback(
    (stage: 'plot' | 'company' | 'workspace', activeFloor: InnovationTowerFloor | null) => {
      if (!stationsGroupRef.current) return;
      const group = stationsGroupRef.current;

      // Clean existing node markers
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }

      if (stage === 'workspace') {
        // Workspace Stations
        const workspaceNodes: InteractiveNode[] = [
          {
            id: 'node-reception-desk',
            name: 'Aria (AI Concierge)',
            type: 'receptionist_npc',
            position: { x: 0, y: 1.8, z: -1 },
            description: 'AI intelligence hub and system guide.',
            activeSessionCount: 0,
          },
          {
            id: 'node-arena-pod-1',
            name: 'Battle Pod Alpha',
            type: 'coding_pod',
            position: { x: -8, y: 1.5, z: -5 },
            description: 'Esports competitive coding pod with automated test runner.',
            activeSessionCount: 0,
          },
          {
            id: 'node-sre-terminal',
            name: 'NOC Incident Response',
            type: 'terminal',
            position: { x: 8, y: 1.5, z: -5 },
            description: 'Site reliability engineering console and cluster telemetry.',
            activeSessionCount: 0,
          },
          {
            id: 'node-admin-console',
            name: 'Executive Command Terminal',
            type: 'terminal',
            position: { x: 7, y: 1.5, z: 8.5 },
            description: 'Master RBAC console and platform identity registry.',
            activeSessionCount: 0,
          },
          {
            id: 'node-portal-exit-plots',
            name: 'Exit to Campus Plaza',
            type: 'portal',
            position: { x: 0, y: 1.0, z: 13.5 },
            description: 'Step outside to the outdoor tech campus and plots.',
            activeSessionCount: 0,
          },
        ];

        stationsRef.current = workspaceNodes;

        workspaceNodes.forEach((node) => {
          const isEmergency = isIncidentActive && node.id === 'node-sre-terminal';
          const icon =
            node.type === 'portal'
              ? '🚪'
              : node.type === 'receptionist_npc'
              ? '🤖'
              : node.type === 'coding_pod'
              ? '⚔️'
              : '💻';

          const marker = ValorantEnvironment.createTacticalWaypointMarker(
            node.name,
            icon,
            isEmergency ? 'emergency' : 'normal'
          );
          marker.position.set(node.position.x, 0, node.position.z);
          marker.userData = { node };
          group.add(marker);
        });
      } else {
        // Outdoor Stations
        const outdoorNodes: InteractiveNode[] = [
          {
            id: 'node-portal-company-workspace',
            name: 'Company Headquarters Entrance',
            type: 'portal',
            position: { x: 0, y: 1.2, z: 3.5 },
            description: 'Enter the company interior workspace.',
            activeSessionCount: 0,
          },
          {
            id: 'node-campus-directory',
            name: 'Campus Directory & Kiosk',
            type: 'terminal',
            position: { x: 0, y: 1.5, z: 8.5 },
            description: 'View land parcel deeds and cadastral estate map.',
            activeSessionCount: 0,
          },
        ];

        stationsRef.current = outdoorNodes;

        outdoorNodes.forEach((node) => {
          const marker = ValorantEnvironment.createTacticalWaypointMarker(
            node.name,
            node.type === 'portal' ? '🏢' : '🗺️',
            'normal'
          );
          marker.position.set(node.position.x, 0, node.position.z);
          marker.userData = { node };
          group.add(marker);
        });
      }
    },
    [isIncidentActive]
  );

  /**
   * Master Stage Transition Engine (Plots <-> Company HQ <-> Workspace)
   */
  const transitionStage = useCallback(
    (newStage: 'plot' | 'company' | 'workspace', customCoords?: { x: number; z: number }) => {
      sounds.playDockSound();
      activeStageRef.current = newStage;
      setLocalStage(newStage);
      if (onStageChangeRef.current) {
        onStageChangeRef.current(newStage);
      }

      // Strict Visual Stage Isolation (Prevents overlapping roads and office tiles!)
      const isWorkspace = newStage === 'workspace';
      if (plotsGroupRef.current) plotsGroupRef.current.visible = !isWorkspace;
      if (companyBuildingGroupRef.current) companyBuildingGroupRef.current.visible = !isWorkspace;
      if (workspaceGroupRef.current) workspaceGroupRef.current.visible = isWorkspace;

      populateStations(newStage, floor);

      // Safe Spawn Target Coordinates
      let targetX = 0;
      let targetZ = 4;

      if (customCoords) {
        targetX = customCoords.x;
        targetZ = customCoords.z;
      } else if (newStage === 'workspace') {
        targetX = 0;
        targetZ = 4; // Center jump pad in workspace
      } else if (newStage === 'company') {
        targetX = 0;
        targetZ = 9.5; // Right in front of building entrance
      } else {
        targetX = -24;
        targetZ = -20; // Plot #1 Founder's Plot
      }

      if (avatarRef.current) {
        avatarRef.current.teleport(targetX, targetZ);
        avatarRef.current.orbitAngle = Math.PI / 4;
        avatarRef.current.orbitPitch = 0.62;
        avatarRef.current.zoomDistance = isWorkspace ? 22.0 : 28.0;
      }

      if (cameraRef.current) {
        const dist = isWorkspace ? 22.0 : 28.0;
        const offsetX = Math.sin(Math.PI / 4) * Math.cos(0.62) * dist;
        const offsetY = Math.sin(0.62) * dist;
        const offsetZ = Math.cos(Math.PI / 4) * Math.cos(0.62) * dist;
        cameraRef.current.position.set(targetX + offsetX, offsetY, targetZ + offsetZ);
        cameraRef.current.lookAt(targetX, 1.2, targetZ);
      }
    },
    [floor, populateStations]
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
          transitionStage('workspace', { x: 0, z: 4 });
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

  // Master WebGL Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene with Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      300
    );
    cameraRef.current = camera;

    // 3. WebGL Renderer with ACESFilmic Tone Mapping and Soft Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Tactical Lighting & Sky Environment
    const { alarmLights } = ValorantEnvironment.setupTacticalLightingAndSky(scene);
    alarmLightsRef.current = alarmLights;

    // 5. Build Outdoor Plots and Roads
    const plotsGroup = buildPlotsAndRoads(worldPlots, isSurveyorActive, (p) => {
      if (onOpenPlotDeed) onOpenPlotDeed(p);
    });
    scene.add(plotsGroup);
    plotsGroupRef.current = plotsGroup;

    // 6. Build Corporate Headquarters Building Facade
    const companyGroup = buildCompanyBuilding();
    scene.add(companyGroup);
    companyBuildingGroupRef.current = companyGroup;

    // 7. Build Valorant-Grade Workspace Interior
    const { group: workspaceGroup, ariaHologram, serverBlades } =
      ValorantEnvironment.buildTacticalWorkspace(36);
    scene.add(workspaceGroup);
    workspaceGroupRef.current = workspaceGroup;
    ariaHologramRef.current = ariaHologram;
    serverBladesRef.current = serverBlades;

    // 8. Stations Group
    const stationsGroup = new THREE.Group();
    scene.add(stationsGroup);
    stationsGroupRef.current = stationsGroup;

    // 9. Initial Stage Setup (Enforce clean stage isolation on boot!)
    const initialStage = activeStageRef.current;
    const isWorkspace = initialStage === 'workspace';
    plotsGroup.visible = !isWorkspace;
    companyGroup.visible = !isWorkspace;
    workspaceGroup.visible = isWorkspace;

    // 10. Valorant Tactical Agent Controller
    const spawnX = isWorkspace ? 0 : -24;
    const spawnZ = isWorkspace ? 4 : -20;
    const avatar = new AvatarController(spawnX, spawnZ);
    avatar.setRole(userRole, displayName);
    scene.add(avatar.mesh);
    avatarRef.current = avatar;

    populateStations(initialStage, floor);

    // Initial Camera Placement
    const dist = isWorkspace ? 22.0 : 28.0;
    const offsetX = Math.sin(Math.PI / 4) * Math.cos(0.62) * dist;
    const offsetY = Math.sin(0.62) * dist;
    const offsetZ = Math.cos(Math.PI / 4) * Math.cos(0.62) * dist;
    camera.position.set(spawnX + offsetX, offsetY, spawnZ + offsetZ);
    camera.lookAt(spawnX, 1.2, spawnZ);

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !camera || !renderer) return;
      const w = Math.max(container.clientWidth, 400);
      const h = Math.max(container.clientHeight, 400);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 12. 60+ FPS Tactical Render Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // Animate Aria AI Hologram (spinning orbital rings and floating crystal)
      if (ariaHologramRef.current) {
        const aria = ariaHologramRef.current;
        aria.rotation.y += delta * 1.4;
        const ring1 = aria.getObjectByName('aria_ring_1');
        const ring2 = aria.getObjectByName('aria_ring_2');
        if (ring1) ring1.rotation.z += delta * 2.2;
        if (ring2) ring2.rotation.x -= delta * 1.8;
      }

      // Animate Server LED Activity Blades
      if (serverBladesRef.current.length > 0) {
        const flicker = 1.2 + Math.sin(currentTime * 0.008) * 0.4;
        serverBladesRef.current.forEach((blade, idx) => {
          (blade.material as THREE.MeshStandardMaterial).emissiveIntensity =
            flicker + Math.sin(currentTime * 0.015 + idx) * 0.3;
        });
      }

      // Update Tactical Agent Movement & Physics
      const isCurrentWorkspace = activeStageRef.current === 'workspace';
      const currentBounds = isCurrentWorkspace ? 16.5 : 62.0;
      const activeColliders = isCurrentWorkspace ? WORKSPACE_COLLIDERS : OUTDOOR_COLLIDERS;

      const { nearbyNode } = avatar.update(
        delta,
        stationsRef.current,
        currentBounds,
        activeColliders
      );
      setNearbyPrompt(nearbyNode);

      // Smooth Tactical Camera Rig
      const currentDist = avatar.zoomDistance || 22.0;
      const currentPitch = Math.max(0.25, Math.min(1.15, avatar.orbitPitch));
      const currentAngle = avatar.orbitAngle;

      const camOffX = Math.sin(currentAngle) * Math.cos(currentPitch) * currentDist;
      const camOffY = Math.sin(currentPitch) * currentDist;
      const camOffZ = Math.cos(currentAngle) * Math.cos(currentPitch) * currentDist;

      const targetCamPos = new THREE.Vector3(
        avatar.position.x + camOffX,
        avatar.position.y + camOffY,
        avatar.position.z + camOffZ
      );

      camera.position.lerp(targetCamPos, delta * 9);
      camera.lookAt(avatar.position.x, avatar.position.y + 1.2, avatar.position.z);

      // Doorway Triggers
      if (isCurrentWorkspace) {
        // Exiting south doorway transitions to Company Plaza
        if (avatar.position.z > 13.6 && Math.abs(avatar.position.x) < 2.5) {
          transitionStage('company', { x: 0, z: 8.5 });
        }
      } else {
        // Entering company front door transitions to Workspace
        if (Math.abs(avatar.position.x) < 2.0 && avatar.position.z <= 3.8 && avatar.position.z >= 1.5) {
          transitionStage('workspace', { x: 0, z: 4 });
        }
      }

      // Compass Update
      setCompassAngle(avatar.orbitAngle);

      // Position update callback (throttled)
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
        if (onZoneChange) onZoneChange(detectedZone);
      }

      // Synchronize Remote Peers
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

          // Sleek Tactical Remote Agent Silhouette
          const pMat = new THREE.MeshStandardMaterial({
            color: peer.avatarColor ? parseInt(peer.avatarColor.replace('#', '0x'), 16) : 0x00f5d4,
            roughness: 0.35,
            metalness: 0.5,
          });

          const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.75, 0.34), pMat);
          torso.position.y = 1.05;
          torso.castShadow = true;
          group.add(torso);

          const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.38, 0.36),
            new THREE.MeshStandardMaterial({ color: 0xd4a373 })
          );
          head.position.y = 1.68;
          group.add(head);

          const legs = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.72, 0.26),
            new THREE.MeshStandardMaterial({ color: 0x181e29 })
          );
          legs.position.y = 0.36;
          group.add(legs);

          // Nametag Sprite
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(8, 8, 240, 48);
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 2;
            ctx.strokeRect(8, 8, 240, 48);
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(peer.name, 128, 38);
          }
          const nametag = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
          );
          nametag.position.y = 2.4;
          nametag.scale.set(1.6, 0.4, 1);
          group.add(nametag);

          scene.add(group);
          peerData = { group, nametag };
          peerMeshesRef.current.set(peer.peerId, peerData);
        }

        peerData.group.position.lerp(new THREE.Vector3(peer.position.x, 0, peer.position.z), delta * 8);
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
  }, []);

  // Handle Canvas Click to Select or Interact
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
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
        background: '#0a0f1d',
      }}
    >
      {/* HUD Top Left: Valorant Tactical Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: '72px',
          left: '20px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 18px',
            borderRadius: '4px',
            background: 'rgba(15, 23, 42, 0.94)',
            borderLeft: '4px solid #00f5d4',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: isIncidentActive ? '#ff4655' : '#00f5d4',
              boxShadow: isIncidentActive
                ? '0 0 10px #ff4655'
                : '0 0 10px #00f5d4',
            }}
          ></span>
          <span>
            {localStage === 'workspace'
              ? 'TACTICAL BASE: KYNETRA HEADQUARTERS'
              : localStage === 'company'
              ? 'CAMPUS PLAZA: EXTERIOR QUAD'
              : 'OUTDOOR ESTATE: CADASTRAL PLOTS'}
          </span>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          WASD: MOVE • SHIFT: TACTICAL DASH • DRAG: ORBIT • SCROLL: ZOOM
        </div>
      </div>

      {/* Nearby Interactive Prompt (Valorant Esports Style) */}
      {nearbyPrompt && (
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(11, 15, 25, 0.95)',
            borderLeft: '4px solid #00f5d4',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 8px 35px rgba(0, 245, 212, 0.3)',
            backdropFilter: 'blur(10px)',
            animation: 'pulse 2s infinite',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '2px',
              backgroundColor: '#00f5d4',
              color: '#0a0f1d',
              fontWeight: 900,
              fontSize: '13px',
              letterSpacing: '0.05em',
            }}
          >
            [ E ]
          </div>
          <div>
            <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '13px', letterSpacing: '0.04em' }}>
              {nearbyPrompt.name.toUpperCase()}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', letterSpacing: '0.02em' }}>
              {nearbyPrompt.description}
            </div>
          </div>
        </div>
      )}

      {/* Tactical Compass Needle in Bottom Left */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          width: '42px',
          height: '42px',
          borderRadius: '4px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00f5d4',
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 900,
          transform: `rotate(${-compassAngle}rad)`,
          transition: 'transform 0.08s linear',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        }}
        title="Tactical Compass"
      >
        ▲
      </div>
    </div>
  );
}
