'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  WorldDistrict,
  InnovationTowerFloor,
  InteractiveNode,
  WorldStats,
  IncidentSimulation,
  UserRole,
} from '@kynetra/contracts';
import { OfficeWorldCanvas } from '../components/3d/OfficeWorldCanvas';
import { WorkstationWorkbenchModal } from '../components/workstation/WorkstationWorkbenchModal';
import { AriaConciergeModal } from '../components/hud/AriaConciergeModal';
import { sounds } from '../components/hud/SoundEffects';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  // Canonical User Role: strictly 'admin', 'architect', or 'employee'
  const [currentRole, setCurrentRole] = useState<UserRole>('employee');

  // 3D Spatial Simulator & Modals State
  const [dockedWorkstationNode, setDockedWorkstationNode] = useState<InteractiveNode | null>(null);
  const [showAriaModal, setShowAriaModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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

      setLoading(false);
    } catch {
      setApiConnected(false);
      setLoading(false);
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
  }, [selectedDistrict?.id]);

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
        onSelectNode={(node) => setSelectedNode(node)}
        onDockWorkstation={(node) => {
          setDockedWorkstationNode(node);
          setSelectedNode(node);
        }}
        isIncidentActive={isIncidentActive}
        selectedNodeId={selectedNode?.id}
        userRole={currentRole}
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
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
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
        </div>

        {/* Global Action Toolbar: Role, Outage Trigger, Aria, Sound */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Canonical Role Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(30, 41, 59, 0.9)',
              padding: '2px 5px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '6px' }}>
              ROLE:
            </span>
            {(['employee', 'architect', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  sounds.playKeyClick();
                  setCurrentRole(r);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  background: currentRole === r ? 'linear-gradient(180deg, #f59e0b, #d97706)' : 'transparent',
                  color: currentRole === r ? '#1a1308' : 'var(--text-secondary)',
                  boxShadow: currentRole === r ? '0 2px 6px rgba(245, 158, 11, 0.4)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

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

      {/* Aria AI Concierge Dialogue Modal */}
      {showAriaModal && (
        <AriaConciergeModal
          onClose={() => setShowAriaModal(false)}
          apiBase={API_BASE}
        />
      )}
    </div>
  );
}
