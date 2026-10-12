'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WorldDistrict,
  InnovationTowerFloor,
  InteractiveNode,
  WorldStats,
  IncidentSimulation,
  UserRole,
  SpatialPeer,
  SpatialZone,
  SpatialChatMessage,
  SpatialEmote,
  SpatialEmoteType,
  SpatialChatChannel,
  AdminUser,
  WorldPlot,
} from '@kynetra/contracts';
import { OfficeWorldCanvas } from '../components/3d/OfficeWorldCanvas';
import { WorkstationWorkbenchModal } from '../components/workstation/WorkstationWorkbenchModal';
import { AdminUserManagementModal } from '../components/workstation/AdminUserManagementModal';
import { AriaConciergeModal } from '../components/hud/AriaConciergeModal';
import { PlotDeedModal } from '../components/hud/PlotDeedModal';
import { sounds } from '../components/hud/SoundEffects';
import { WebRtcManager } from '../lib/webrtc/WebRtcManager';
import { WorkAdventureActionBar } from '../components/hud/WorkAdventureActionBar';
import { ProximityVideoBubbles } from '../components/hud/ProximityVideoBubbles';
import { SpatialChatDrawer } from '../components/hud/SpatialChatDrawer';
import { CoworkerDirectoryModal } from '../components/hud/CoworkerDirectoryModal';
import { LoginPage } from '../components/auth/LoginPage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEFAULT_PLOTS: WorldPlot[] = [
  {
    id: 'plot-01',
    plotNumber: 1,
    name: "Founder's Innovation Plot",
    status: 'occupied',
    dimensions: { width: 48, depth: 36 },
    coordinates: { x: -28, z: -25 },
    ownerName: 'Admin (Founder)',
    zoningType: 'Innovation Lab',
    assignedBuilding: 'Kynetra Tech Campus HQ',
    deedId: 'DEED-KYN-001-A',
    areaSquareMeters: 1728,
  },
  {
    id: 'plot-02',
    plotNumber: 2,
    name: 'North-East Greenfield Sandbox',
    status: 'available',
    dimensions: { width: 44, depth: 36 },
    coordinates: { x: 28, z: -25 },
    ownerName: 'Unassigned (Open for Claim)',
    zoningType: 'Greenfield Parcel',
    deedId: 'DEED-KYN-002-B',
    areaSquareMeters: 1584,
  },
  {
    id: 'plot-03',
    plotNumber: 3,
    name: 'Developer Guild Parcel Alpha',
    status: 'reserved',
    dimensions: { width: 46, depth: 34 },
    coordinates: { x: -28, z: 25 },
    ownerName: 'Open Source Maintainers Guild',
    zoningType: 'Commercial Enterprise',
    deedId: 'DEED-KYN-003-C',
    areaSquareMeters: 1564,
  },
  {
    id: 'plot-04',
    plotNumber: 4,
    name: 'Enterprise Cloud Datacenter Plot',
    status: 'occupied',
    dimensions: { width: 44, depth: 34 },
    coordinates: { x: 28, z: 25 },
    ownerName: 'Cloud Infrastructure SRE Team',
    zoningType: 'Cloud Data Facility',
    assignedBuilding: 'Kubernetes Edge Data Center',
    deedId: 'DEED-KYN-004-D',
    areaSquareMeters: 1496,
  },
  {
    id: 'plot-05',
    plotNumber: 5,
    name: 'South Parkway Tech Reserve',
    status: 'available',
    dimensions: { width: 38, depth: 32 },
    coordinates: { x: 0, z: 44 },
    ownerName: 'Kynetra Municipal Land Registry',
    zoningType: 'Greenfield Parcel',
    deedId: 'DEED-KYN-005-E',
    areaSquareMeters: 1216,
  },
  {
    id: 'plot-06',
    plotNumber: 6,
    name: 'Algorithmic Coding Arena Grounds',
    status: 'occupied',
    dimensions: { width: 38, depth: 32 },
    coordinates: { x: 0, z: -44 },
    ownerName: 'Competitive Programming League',
    zoningType: 'Commercial Enterprise',
    assignedBuilding: 'Esports Coding Colosseum',
    deedId: 'DEED-KYN-006-F',
    areaSquareMeters: 1216,
  },
];

interface ActiveSimulationData {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'running' | 'resolved';
  errorRate: number;
}

export default function HomePage() {
  const [districts, setDistricts] = useState<WorldDistrict[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<WorldDistrict | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<InnovationTowerFloor | null>(null);
  const [selectedNode, setSelectedNode] = useState<InteractiveNode | null>(null);
  const [, setStats] = useState<WorldStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);

  // Plot & Stage Progression State
  const [currentStage, setCurrentStage] = useState<'plot' | 'company' | 'workspace'>('plot');
  const [viewMode, setViewMode] = useState<'3d' | 'iso'>('iso');
  const [isSurveyorActive, setIsSurveyorActive] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<WorldPlot | null>(null);
  const [showPlotDeedModal, setShowPlotDeedModal] = useState(false);

  // Authenticated User & Database-driven Role
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);

  const currentRole: UserRole = currentUser?.role || 'employee';
  const currentDbUser = currentUser;

  // 3D Spatial Simulator & Modals State
  const [dockedWorkstationNode, setDockedWorkstationNode] = useState<InteractiveNode | null>(null);
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  const [showAriaModal, setShowAriaModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // WorkAdventure Spatial Presence & WebRTC State
  const webrtcManagerRef = useRef<WebRtcManager | null>(null);
  const [peers, setPeers] = useState<SpatialPeer[]>([]);
  const [proximityPeers, setProximityPeers] = useState<SpatialPeer[]>([]);
  const [chatMessages, setChatMessages] = useState<SpatialChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(false);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [activeEmote, setActiveEmote] = useState<SpatialEmote | null>(null);
  const [teleportTarget, setTeleportTarget] = useState<{ x: number; z: number } | null>(null);
  const [localMediaState, setLocalMediaState] = useState<SpatialPeer['mediaState']>({
    micOn: false,
    cameraOn: false,
    screenSharing: false,
    speaking: false,
  });
  const [currentZone, setCurrentZone] = useState<SpatialZone | null>(null);

  // Simulations State
  const [simulations, setSimulations] = useState<ActiveSimulationData[]>([]);


  // Notifications
  const [notice, setNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Fetch real data from API
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE}/api/v1/telemetry/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setApiConnected(true);
      }

      // 2. Fetch Districts
      const distRes = await fetch(`${API_BASE}/api/v1/world/districts`);
      if (distRes.ok) {
        const distData = await distRes.json();
        const distList: WorldDistrict[] = distData.districts || [];
        setDistricts((prev) => (prev.length === distList.length ? prev : distList));

        // Keep selected district initialized
        setSelectedDistrict((prev) => {
          if (!prev) return distList[0] || null;
          return prev;
        });
      }

      // 3. Fetch Simulations
      const simRes = await fetch(`${API_BASE}/api/v1/simulations`);
      if (simRes.ok) {
        const simData = await simRes.json();
        const incoming: ActiveSimulationData[] = simData.simulations || [];
        setSimulations((prev) => {
          if (
            prev.length === incoming.length &&
            prev.every((p, idx) => p.id === incoming[idx]?.id && p.status === incoming[idx]?.status)
          ) {
            return prev;
          }
          return incoming;
        });
      }

      // 4. Fetch Real Database Users from PostgreSQL
      const usersRes = await fetch(`${API_BASE}/api/v1/admin/users`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const uList: AdminUser[] = usersData.users || [];
        setAllUsers(uList);
        setCurrentUser((prev) => {
          if (prev) {
            const refreshed = uList.find((u) => u.id === prev.id);
            if (refreshed) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('kynetra_auth_user', JSON.stringify(refreshed));
              }
              return refreshed;
            }
          }
          return prev;
        });
      }

      setLoading(false);
    } catch {
      setApiConnected(false);
      setLoading(false);
    }
  }, []);

  // Check persisted authentication session on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('kynetra_auth_user');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        }
      }
    } catch {
      // ignore parse failure
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // Initial and polling fetch
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Sync selected floor only when district ID changes
  useEffect(() => {
    if (selectedDistrict && selectedDistrict.floors && selectedDistrict.floors.length > 0) {
      setSelectedFloor((prev) => {
        if (!prev) return selectedDistrict.floors![0];
        const existing = selectedDistrict.floors!.find((f) => f.floorNumber === prev.floorNumber);
        return existing || selectedDistrict.floors![0];
      });
    } else {
      setSelectedFloor(null);
      setSelectedNode(null);
    }
  }, [selectedDistrict]);

  const handleDistrictSelect = (d: WorldDistrict) => {
    setSelectedDistrict(d);
    if (d.floors && d.floors.length > 0) {
      setSelectedFloor(d.floors[0]);
      setSelectedNode(d.floors[0].nodes[0] || null);
    } else {
      setSelectedFloor(null);
      setSelectedNode(null);
    }
  };

  const handleFloorSelect = (f: InnovationTowerFloor) => {
    setSelectedFloor(f);
    setSelectedNode(f.nodes[0] || null);
  };

  // Initialize WorkAdventure WebRTC & Spatial Presence Manager
  useEffect(() => {
    const localUserId = currentDbUser?.id || 'usr_admin_01';
    const localUserName = currentDbUser?.displayName || 'Admin';

    const manager = new WebRtcManager(
      {
        id: localUserId,
        name: localUserName,
        role: currentRole,
      },
      {
        onPeersUpdated: (updatedPeers) => setPeers(updatedPeers),
        onProximityPeersChanged: (proxPeers) => setProximityPeers(proxPeers),
        onChatMessageReceived: (msg) => {
          setChatMessages((prev) => [...prev, msg]);
          if (!isChatOpenRef.current) {
            setUnreadChatCount((c) => c + 1);
            sounds.playMessageChime();
          }
        },
        onEmoteReceived: (emote) => {
          setActiveEmote(emote);
          sounds.playTone(440, 0.1);
        },
        onLocalMediaStateChanged: (state) => setLocalMediaState(state),
        onCurrentZoneChanged: (zone) => {
          setCurrentZone(zone);
          if (zone) {
            showNotification(`Entered ${zone.name}`);
            sounds.playStationSelect();
          }
        },
      }
    );

    webrtcManagerRef.current = manager;

    return () => {
      manager.destroy();
    };
  }, [currentDbUser?.id]);

  // Synchronize local user when database user profile updates
  useEffect(() => {
    if (webrtcManagerRef.current && currentDbUser) {
      webrtcManagerRef.current.setLocalUser({
        id: currentDbUser.id,
        name: currentDbUser.displayName,
        role: currentRole,
      });
    }
  }, [currentDbUser, currentRole]);

  // WebRTC Action Handlers
  const handleToggleMic = async () => {
    if (webrtcManagerRef.current) {
      const isNowOn = await webrtcManagerRef.current.toggleMicrophone();
      showNotification(isNowOn ? 'Microphone unmuted (VAD active)' : 'Microphone muted');
    }
  };

  const handleToggleCamera = async () => {
    if (webrtcManagerRef.current) {
      const isNowOn = await webrtcManagerRef.current.toggleCamera();
      showNotification(isNowOn ? 'Camera stream activated' : 'Camera turned off');
    }
  };

  const handleToggleScreenShare = async () => {
    if (webrtcManagerRef.current) {
      if (localMediaState.screenSharing) {
        webrtcManagerRef.current.stopScreenShare();
        showNotification('Stopped screen sharing');
      } else {
        const stream = await webrtcManagerRef.current.startScreenShare();
        if (stream) {
          showNotification('Screen sharing live to coworkers');
        }
      }
    }
  };

  const handleSendEmote = (emote: SpatialEmoteType) => {
    webrtcManagerRef.current?.sendEmote(emote);
  };

  const handleSendMessage = (text: string, channel: SpatialChatChannel) => {
    webrtcManagerRef.current?.sendChatMessage(text, channel);
  };

  const handleTeleportToPeer = (peer: SpatialPeer) => {
    setTeleportTarget({ x: peer.position.x + 1.2, z: peer.position.z });
    showNotification(`Teleported to ${peer.name}`);
    sounds.playLevelUp();
  };


  // Real Simulation Launcher
  const handleStartSimulation = async (scenarioId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulations/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, districtId: selectedDistrict?.id || 'kynetra-central' }),
      });

      if (res.ok) {
        const sim = await res.json();
        showNotification(`Simulation launched: [${sim.name}] with error rate ${sim.errorRate}%`);
        fetchData();
      }
    } catch {
      showNotification(`Failed to launch simulation`);
    }
  };

  // Real Simulation Resolver
  const handleStopSimulation = async (simId: string) => {
    try {
      setSimulations((prev) => prev.filter((s) => s.id !== simId));
      await fetch(`${API_BASE}/api/v1/simulations/${simId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      showNotification(`Incident simulation resolved and decommissioned.`);
      fetchData();
    } catch {
      showNotification(`Failed to stop simulation`);
    }
  };

  // Clear All Running Simulations
  const handleClearAllSimulations = async () => {
    try {
      setSimulations([]);
      await fetch(`${API_BASE}/api/v1/simulations/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      showNotification(`All incident simulations cleared.`);
      fetchData();
    } catch {
      showNotification(`Failed to clear simulations`);
    }
  };

  const runningSimulations = simulations.filter((s) => s.status === 'running');
  const isIncidentActive = runningSimulations.length > 0;

  const handleQuickTriggerIncident = async () => {
    sounds.playAlarmPulse();
    await handleStartSimulation('db-starvation');
    showNotification('🚨 Incident Triggered: PostgreSQL Connection Pool Starvation! Check Floor 8.');
  };

  if (!authChecked) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100vw',
          height: '100vh',
          background: '#0a0d14',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="status-pulse active"
            style={{ margin: '0 auto 16px auto', width: '24px', height: '24px' }}
          />
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            Initializing Kynetra Security Engine...
          </h2>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        apiBaseUrl={API_BASE}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showNotification(`Clearance verified: Welcome, ${user.displayName} [${user.role.toUpperCase()}]`);
        }}
      />
    );
  }

  if (loading && districts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100vw',
          height: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="status-pulse active"
            style={{ margin: '0 auto 16px auto', width: '24px', height: '24px' }}
          />
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Connecting to Kynetra World Engine...</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Querying API at {API_BASE}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="viewport-3d-fullscreen">
      {/* 3D Viewport Canvas Spanning Full Screen */}
      <OfficeWorldCanvas
        floor={selectedFloor}
        worldPlots={selectedDistrict?.plots && selectedDistrict.plots.length > 0 ? selectedDistrict.plots : DEFAULT_PLOTS}
        onSelectNode={(node) => setSelectedNode(node)}
        onDockWorkstation={(node) => {
          if (node.id === 'node-admin-console') {
            if (currentRole !== 'admin') {
              sounds.playAlarmPulse();
              showNotification('⛔ Access Denied: Executive Admin clearance required to access User Management Terminal.');
              return;
            }
            setShowAdminUserModal(true);
            setSelectedNode(node);
            return;
          }
          setDockedWorkstationNode(node);
          setSelectedNode(node);
        }}
        isIncidentActive={isIncidentActive}
        selectedNodeId={selectedNode?.id}
        userRole={currentRole}
        displayName={currentDbUser?.displayName || 'Admin'}
        peers={peers}
        localPeerId={webrtcManagerRef.current?.getLocalPeerId() || currentDbUser?.id || 'usr_admin_01'}
        localUserId={currentDbUser?.id || 'usr_admin_01'}
        onUpdatePosition={(x, y, z, rot) => {
          webrtcManagerRef.current?.updateLocalPosition(x, y, z, rot);
        }}
        onZoneChange={(zone) => setCurrentZone(zone)}
        activeEmote={activeEmote}
        teleportTarget={teleportTarget}
        onTeleportCompleted={() => setTeleportTarget(null)}
        currentStage={currentStage}
        onStageChange={(stage) => {
          setCurrentStage(stage);
          if (stage === 'workspace') {
            showNotification('Entered Kynetra Company Workspace.');
          } else if (stage === 'company') {
            showNotification('Approaching Company Headquarters Entrance.');
          } else {
            showNotification('Outdoor Estate: Land Parcels & Plots.');
          }
        }}
        onOpenPlotDeed={(plot) => {
          const plotsList = selectedDistrict?.plots && selectedDistrict.plots.length > 0 ? selectedDistrict.plots : DEFAULT_PLOTS;
          setSelectedPlot(plot || plotsList[0]);
          setShowPlotDeedModal(true);
        }}
        isSurveyorActive={isSurveyorActive}
        onToggleSurveyor={() => {
          sounds.playKeyClick();
          setIsSurveyorActive((prev) => !prev);
          showNotification(!isSurveyorActive ? 'Surveyor plot dimensions overlay activated' : 'Surveyor overlay hidden');
        }}
        viewMode={viewMode}
        onToggleViewMode={() => {
          sounds.playKeyClick();
          const next = viewMode === '3d' ? 'iso' : '3d';
          setViewMode(next);
          showNotification(next === 'iso' ? 'Switched to 2D Isometric View' : 'Switched to 3D Follow View');
        }}
      />


      {/* Floating Cyber HUD Top Bar */}
      <header className="hud-floating-bar" style={{ minHeight: '44px', padding: '4px 14px' }}>
        {/* Brand & World District / Floor Deck Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-badge" style={{ padding: '2px 7px', fontSize: '11px' }}>
              KY
            </span>
            <span className="brand-title" style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
              KYNETRA
            </span>
          </div>

          {/* District Selector Dropdown Badge */}
          <select
            value={selectedDistrict?.id || ''}
            onChange={(e) => {
              sounds.playKeyClick();
              const d = districts.find((item) => item.id === e.target.value);
              if (d) handleDistrictSelect(d);
            }}
            style={{
              background: 'rgba(30, 41, 59, 0.95)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id} style={{ background: '#1e293b', color: '#fff' }}>
                District: {d.name}
              </option>
            ))}
          </select>

          {/* Floor Selector Deck Pills */}
          {selectedDistrict?.floors && selectedDistrict.floors.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
                paddingLeft: '10px',
              }}
            >
              {selectedDistrict.floors.map((f) => (
                <button
                  key={f.floorNumber}
                  onClick={() => {
                    sounds.playKeyClick();
                    handleFloorSelect(f);
                  }}
                  className={`hud-pill ${selectedFloor?.floorNumber === f.floorNumber ? 'active' : ''}`}
                  style={{ padding: '3px 9px', fontSize: '11px', whiteSpace: 'nowrap' }}
                >
                  <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>L{f.floorNumber}:</span>{' '}
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {/* Spatial 3-Tier Progression: Plots -> Company HQ -> Workspace */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
              paddingLeft: '10px',
            }}
          >
            <button
              onClick={() => {
                sounds.playKeyClick();
                setCurrentStage('plot');
                setTeleportTarget({ x: -24, z: -20 });
                showNotification('📍 Roaming Outdoor Estate & Land Plots.');
              }}
              className={`hud-pill ${currentStage === 'plot' ? 'active' : ''}`}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: currentStage === 'plot' ? '#4ade80' : '#94a3b8',
                borderColor: currentStage === 'plot' ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                background: currentStage === 'plot' ? 'rgba(34, 197, 94, 0.2)' : undefined,
              }}
              title="Fast-travel to Plot #1 (Outdoors)"
            >
              📍 1. PLOTS
            </button>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '10px' }}>➔</span>
            <button
              onClick={() => {
                sounds.playKeyClick();
                setCurrentStage('company');
                setTeleportTarget({ x: 0, z: 9.5 });
                showNotification('🏢 Approaching Company Headquarters Plaza.');
              }}
              className={`hud-pill ${currentStage === 'company' ? 'active' : ''}`}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: currentStage === 'company' ? '#38bdf8' : '#94a3b8',
                borderColor: currentStage === 'company' ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)',
                background: currentStage === 'company' ? 'rgba(14, 165, 233, 0.2)' : undefined,
              }}
              title="Fast-travel to Company Campus Plaza"
            >
              🏢 2. COMPANY HQ
            </button>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '10px' }}>➔</span>
            <button
              onClick={() => {
                sounds.playKeyClick();
                setCurrentStage('workspace');
                setTeleportTarget({ x: 0, z: 11 });
                showNotification('💻 Entered Kynetra Engineering Workspace.');
              }}
              className={`hud-pill ${currentStage === 'workspace' ? 'active' : ''}`}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: currentStage === 'workspace' ? '#fbbf24' : '#94a3b8',
                borderColor: currentStage === 'workspace' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                background: currentStage === 'workspace' ? 'rgba(245, 158, 11, 0.2)' : undefined,
              }}
              title="Fast-travel to Interior Engineering Workspace"
            >
              💻 3. WORKSPACE
            </button>
          </div>
        </div>

        {/* Global Action Toolbar: Role, Outage Trigger, Aria, Sound */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Authenticated User Clearance Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(30, 41, 59, 0.9)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '13px' }}>
              {currentRole === 'admin' ? '👑' : currentRole === 'architect' ? '📐' : '👤'}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
              {currentUser.displayName}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: currentRole === 'admin' ? '#fbbf24' : currentRole === 'architect' ? '#38bdf8' : '#34d399',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.04em',
              }}
            >
              {currentRole}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              sounds.playKeyClick();
              if (typeof window !== 'undefined') {
                localStorage.removeItem('kynetra_auth_user');
                localStorage.removeItem('kynetra_auth_token');
              }
              setCurrentUser(null);
              showNotification('Signed out from workspace.');
            }}
            className="btn-secondary"
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              color: 'var(--text-secondary)',
            }}
            title="Sign Out from Kynetra Workspace"
          >
            <span>🚪</span> Sign Out
          </button>

          {/* Admin User Management Terminal Quick Access */}
          {currentRole === 'admin' && (
            <button
              onClick={() => {
                sounds.playDockSound();
                setShowAdminUserModal(true);
              }}
              className="btn-secondary"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderColor: '#f59e0b',
                color: '#fbbf24',
                fontWeight: 700,
              }}
              title="Open Admin User Management Terminal"
            >
              <span>👑</span> Admin Users
            </button>
          )}

          {/* Admin Diagnostics: Quick Outage Trigger */}
          {currentRole === 'admin' && (
            <button
              onClick={handleQuickTriggerIncident}
              className="btn-secondary"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderColor: isIncidentActive ? 'var(--accent-rose)' : undefined,
                color: isIncidentActive ? 'var(--accent-rose)' : undefined,
                fontWeight: 700,
              }}
            >
              <span>⚙️</span> {isIncidentActive ? 'Outage Active' : 'Simulate SRE Outage'}
            </button>
          )}

          {/* Aria AI Concierge */}
          <button
            onClick={() => {
              sounds.playKeyClick();
              setShowAriaModal(true);
            }}
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            <span>🤖</span> Aria Concierge
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              sounds.enabled = !next;
            }}
            className="btn-secondary"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
          </button>

          {/* Connection Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: apiConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background: apiConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              border: `1px solid ${apiConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: apiConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                display: 'inline-block',
              }}
            />
            <span>{apiConnected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px' }}
            onClick={fetchData}
            title="Sync Now"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Floating Active Incident Alert Banner */}
      {isIncidentActive && runningSimulations[0] && (
        <div className="hud-alert-banner">
          <span>🚨</span>
          <span>
            <strong>ACTIVE SRE INCIDENT:</strong> {runningSimulations[0].name} ({runningSimulations[0].severity.toUpperCase()} - {runningSimulations[0].errorRate}% Error Rate)
          </span>
          <button
            onClick={() => handleStopSimulation(runningSimulations[0].id)}
            style={{
              background: '#fff',
              border: 'none',
              color: '#991b1b',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Resolve Fix
          </button>
          <button
            onClick={handleClearAllSimulations}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {notice && (
        <div className="hud-toast">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Workstation Workbench Modal */}
      {dockedWorkstationNode && (
        <WorkstationWorkbenchModal
          node={dockedWorkstationNode}
          onClose={() => setDockedWorkstationNode(null)}
          apiBase={API_BASE}
          isIncidentActive={isIncidentActive}
          activeSimulation={(simulations.find((s) => s.status === 'running') as unknown as IncidentSimulation) || null}
          userRole={currentRole}
          onPatchApplied={() => {
            showNotification('Mitigation patch verified and deployed successfully.');
            fetchData();
          }}
        />
      )}

      {/* Executive Admin Room: Real User Management & RBAC Modal */}
      {showAdminUserModal && (
        <AdminUserManagementModal
          apiBase={API_BASE}
          userRole={currentRole}
          onClose={() => setShowAdminUserModal(false)}
          onUserModified={fetchData}
        />
      )}

      {/* Aria AI Concierge Dialogue Modal */}
      {showAriaModal && (
        <AriaConciergeModal
          onClose={() => setShowAriaModal(false)}
          apiBase={API_BASE}
        />
      )}

      {/* WorkAdventure Proximity Video Bubbles */}
      <ProximityVideoBubbles
        proximityPeers={proximityPeers}
        localStream={webrtcManagerRef.current?.getLocalStream() || null}
        localName={currentDbUser?.displayName || 'Admin'}
        isCameraOn={localMediaState.cameraOn}
        isMicOn={localMediaState.micOn}
        isSpeaking={localMediaState.speaking}
        getPeerStream={(peerId) => webrtcManagerRef.current?.getPeerStream(peerId)}
      />

      {/* WorkAdventure Floating Action Bar */}
      <WorkAdventureActionBar
        localMediaState={localMediaState}
        currentZone={currentZone}
        onlineCount={peers.length}
        unreadChatCount={unreadChatCount}
        isChatOpen={isChatOpen}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onSendEmote={handleSendEmote}
        onToggleChat={() => {
          setIsChatOpen((prev) => !prev);
          setUnreadChatCount(0);
        }}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
      />

      {/* WorkAdventure Spatial Chat Drawer */}
      <SpatialChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        localPeerId={webrtcManagerRef.current?.getLocalPeerId() || currentDbUser?.id || 'usr_admin_01'}
      />

      {/* WorkAdventure Coworkers Directory Modal */}
      <CoworkerDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        peers={peers}
        localPeerId={webrtcManagerRef.current?.getLocalPeerId() || currentDbUser?.id || 'usr_admin_01'}
        onTeleportToPeer={handleTeleportToPeer}
      />

      {/* Plot Land Deed & Municipal Ownership Certificate Modal */}
      {showPlotDeedModal && (
        <PlotDeedModal
          plot={selectedPlot || (selectedDistrict?.plots && selectedDistrict.plots[0]) || DEFAULT_PLOTS[0]}
          allPlots={selectedDistrict?.plots && selectedDistrict.plots.length > 0 ? selectedDistrict.plots : DEFAULT_PLOTS}
          onSelectPlot={(p) => setSelectedPlot(p)}
          onClose={() => setShowPlotDeedModal(false)}
          onTeleportToPlot={(p) => {
            sounds.playDockSound();
            setTeleportTarget({ x: p.coordinates.x, z: p.coordinates.z });
            setCurrentStage('plot');
            showNotification(`Teleported to Plot #${p.plotNumber}: ${p.name}`);
          }}
          onEnterWorkspace={() => {
            sounds.playDockSound();
            setTeleportTarget({ x: 0, z: 4 });
            setCurrentStage('workspace');
            showNotification('Entered Kynetra Company Workspace.');
          }}
        />
      )}
    </div>
  );
}

