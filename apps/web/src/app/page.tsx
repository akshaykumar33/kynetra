'use client';

import React, { useState } from 'react';
import type { WorldDistrict, InnovationTowerFloor, InteractiveNode } from '@kynetra/contracts';

const DISTRICTS_DATA: WorldDistrict[] = [
  {
    id: 'kynetra-central',
    name: 'Kynetra Central',
    theme: 'Civic & Headquarters',
    description:
      'The civic core of Kynetra. Features Central Plaza, civic forums, and the Innovation Tower.',
    coordinates: { x: 0, y: 0 },
    status: 'active',
    activeUsers: 342,
    keyLandmark: 'Innovation Tower',
    floors: [
      {
        floorNumber: 1,
        name: 'Lobby & Reception',
        category: 'lobby',
        description: 'Grand reception concourse with AI Receptionist and fast-travel portals.',
        capacity: 250,
        currentOccupancy: 84,
        nodes: [
          {
            id: 'node-reception-desk',
            name: 'Aria (AI Receptionist)',
            type: 'receptionist_npc',
            position: { x: 0, y: 1.5, z: -5 },
            description: 'Intelligent concierge guiding developers to floors and arenas.',
            activeSessionCount: 12,
          },
          {
            id: 'node-portal-arena',
            name: 'Arena Fast Portal',
            type: 'portal',
            position: { x: 10, y: 1, z: -2 },
            description: 'Direct transit to Coding Arena on Floor 4.',
            activeSessionCount: 0,
          },
        ],
      },
      {
        floorNumber: 4,
        name: 'Algorithmic Coding Arena',
        category: 'coding_arena',
        description: 'High-stakes multiplayer coding pods with live test harness evaluation.',
        capacity: 100,
        currentOccupancy: 67,
        nodes: [
          {
            id: 'node-arena-pod-1',
            name: 'Battle Pod Alpha',
            type: 'coding_pod',
            position: { x: -8, y: 1, z: 4 },
            description: 'Competitive dual-terminal coding pod with automated test runner.',
            activeSessionCount: 2,
          },
          {
            id: 'node-arena-whiteboard',
            name: 'System Architecture Board',
            type: 'whiteboard',
            position: { x: 0, y: 2, z: 8 },
            description: 'Collaborative real-time diagramming canvas.',
            activeSessionCount: 4,
          },
        ],
      },
      {
        floorNumber: 8,
        name: 'Cloud Infrastructure & SRE Lab',
        category: 'cloud_lab',
        description: 'Interactive server racks, live telemetry boards, and simulated outages.',
        capacity: 80,
        currentOccupancy: 39,
        nodes: [
          {
            id: 'node-cloud-rack-01',
            name: 'Simulated Kubernetes Cluster Rack',
            type: 'cloud_lab_rack',
            position: { x: 6, y: 1.5, z: 0 },
            description: 'Physical cluster replica with live circuit breaker controls.',
            activeSessionCount: 5,
          },
          {
            id: 'node-sre-terminal',
            name: 'NOC Incident Response Terminal',
            type: 'terminal',
            position: { x: -6, y: 1, z: 0 },
            description: 'Real-time observability console and chaos engineering triggers.',
            activeSessionCount: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'developer-district',
    name: 'Developer District',
    theme: 'Open Source & Tooling',
    description: 'Home to collaborative open-source guilds, compiler workshops, and hackathons.',
    coordinates: { x: 250, y: 50 },
    status: 'active',
    activeUsers: 215,
    keyLandmark: 'Open Source Guild Hall',
  },
  {
    id: 'ai-research-district',
    name: 'AI Research District',
    theme: 'Intelligence & Simulation',
    description:
      'Neural training clusters, agent laboratories, and synthetic personality testing grounds.',
    coordinates: { x: -180, y: 220 },
    status: 'active',
    activeUsers: 189,
    keyLandmark: 'Neural Foundry',
  },
  {
    id: 'cybersecurity-district',
    name: 'Cybersecurity District',
    theme: 'Defense & Offense Simulation',
    description:
      'Red team/blue team battlegrounds, vulnerability ranges, and forensic sandbox chambers.',
    coordinates: { x: -300, y: -150 },
    status: 'in_construction',
    activeUsers: 45,
    keyLandmark: 'Zero Trust Citadel',
  },
];

export default function HomePage() {
  const [selectedDistrict, setSelectedDistrict] = useState<WorldDistrict>(DISTRICTS_DATA[0]);
  const [selectedFloor, setSelectedFloor] = useState<InnovationTowerFloor | null>(
    DISTRICTS_DATA[0].floors ? DISTRICTS_DATA[0].floors[0] : null,
  );
  const [selectedNode, setSelectedNode] = useState<InteractiveNode | null>(
    DISTRICTS_DATA[0].floors && DISTRICTS_DATA[0].floors[0].nodes[0]
      ? DISTRICTS_DATA[0].floors[0].nodes[0]
      : null,
  );
  const [activeActionNotice, setActiveActionNotice] = useState<string | null>(null);

  const handleDistrictChange = (d: WorldDistrict) => {
    setSelectedDistrict(d);
    if (d.floors && d.floors.length > 0) {
      setSelectedFloor(d.floors[0]);
      setSelectedNode(d.floors[0].nodes[0] || null);
    } else {
      setSelectedFloor(null);
      setSelectedNode(null);
    }
  };

  const handleFloorChange = (f: InnovationTowerFloor) => {
    setSelectedFloor(f);
    setSelectedNode(f.nodes[0] || null);
  };

  const triggerNodeAction = (node: InteractiveNode) => {
    setActiveActionNotice(
      `Connected to [${node.name}] — session initialized at coordinates (${node.position.x}, ${node.position.y}, ${node.position.z})`,
    );
    setTimeout(() => setActiveActionNotice(null), 4000);
  };

  return (
    <div className="app-container">
      {/* Hero / Header Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Kynetra World Operations Console</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '750px' }}>
          Explore the persistent digital IT metropolis. Select districts, inspect building floors,
          interact with AI entities, and monitor real-time infrastructure simulations.
        </p>
      </section>

      {/* Telemetry Row */}
      <section className="telemetry-row">
        <div className="glass-panel metric-card">
          <span className="label">Online Developers</span>
          <span className="value mono">791</span>
          <span className="sub">↑ +14.2% today</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="label">Active Simulations</span>
          <span className="value mono">18</span>
          <span className="sub">2 incident tests running</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="label">Arena Matches</span>
          <span className="value mono">9</span>
          <span className="sub">Algorithm duels</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="label">Core Availability</span>
          <span className="value mono" style={{ color: 'var(--accent-emerald)' }}>
            99.98%
          </span>
          <span className="sub">Zero active alerts</span>
        </div>
      </section>

      {/* Action Notification Banner */}
      {activeActionNotice && (
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid var(--accent-cyan)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-highlight)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{activeActionNotice}</span>
          <button
            onClick={() => setActiveActionNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Districts & Details */}
      <section className="main-grid">
        {/* District Selector List */}
        <div className="glass-panel district-list">
          <h2
            style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}
          >
            Districts of Kynetra
          </h2>

          {DISTRICTS_DATA.map((district) => {
            const isSelected = selectedDistrict.id === district.id;
            return (
              <div
                key={district.id}
                id={`district-${district.id}`}
                className={`district-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleDistrictChange(district)}
              >
                <div className="district-header">
                  <span className="district-name">{district.name}</span>
                  <span className="district-users mono">{district.activeUsers} online</span>
                </div>
                <p className="district-theme">{district.theme}</p>
              </div>
            );
          })}
        </div>

        {/* District Detail & Floor Viewport */}
        <div className="glass-panel viewport-panel">
          <div className="viewport-header">
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}
              >
                <h2 className="viewport-title">{selectedDistrict.name}</h2>
                <span className={`status-badge ${selectedDistrict.status}`}>
                  {selectedDistrict.status === 'active' ? '● Operational' : '◌ Under Construction'}
                </span>
              </div>
              <p className="viewport-desc">{selectedDistrict.description}</p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}
              >
                Landmark
              </span>
              <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {selectedDistrict.keyLandmark}
              </div>
            </div>
          </div>

          {/* If the district has floors (e.g. Kynetra Central / Innovation Tower) */}
          {selectedDistrict.floors && selectedDistrict.floors.length > 0 && selectedFloor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '10px',
                  }}
                >
                  Innovation Tower — Floor Deck
                </h3>
                <div className="floor-selector">
                  {selectedDistrict.floors.map((floor) => {
                    const isFloorActive = selectedFloor.floorNumber === floor.floorNumber;
                    return (
                      <button
                        key={floor.floorNumber}
                        id={`floor-btn-${floor.floorNumber}`}
                        className={`floor-tab ${isFloorActive ? 'active' : ''}`}
                        onClick={() => handleFloorChange(floor)}
                      >
                        <span>F{floor.floorNumber}</span>
                        <span>{floor.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Floor Details Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px' }}>
                    {selectedFloor.name}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedFloor.description}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Occupancy</span>
                  <div
                    className="mono"
                    style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-highlight)' }}
                  >
                    {selectedFloor.currentOccupancy} / {selectedFloor.capacity}
                  </div>
                </div>
              </div>

              {/* Interactive Nodes in this floor */}
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '12px',
                  }}
                >
                  Interactive Workstations & Nodes
                </h3>
                <div className="nodes-grid">
                  {selectedFloor.nodes.map((node) => {
                    const isNodeActive = selectedNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        id={`node-${node.id}`}
                        className="node-card"
                        style={{
                          borderColor: isNodeActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                          background: isNodeActive
                            ? 'rgba(6, 182, 212, 0.08)'
                            : 'rgba(255, 255, 255, 0.02)',
                        }}
                        onClick={() => setSelectedNode(node)}
                      >
                        <div className="node-header">
                          <span className="node-name">{node.name}</span>
                          <span className="node-type">{node.type}</span>
                        </div>
                        <p className="node-desc">{node.description}</p>
                        <div className="node-footer">
                          <span className="mono">
                            ({node.position.x}, {node.position.y}, {node.position.z})
                          </span>
                          <button
                            id={`action-btn-${node.id}`}
                            className="btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerNodeAction(node);
                            }}
                          >
                            Interact
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* When no floors are available yet */}
          {(!selectedDistrict.floors || selectedDistrict.floors.length === 0) && (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.01)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-subtle)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Spatial Construction in Progress
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  maxWidth: '500px',
                  margin: '0 auto 20px',
                }}
              >
                This district is currently undergoing terraforming and structural layout in the
                World Engine. Full floorplans and workstations unlock in Phase 01.
              </p>
              <button
                className="btn-secondary"
                onClick={() => handleDistrictChange(DISTRICTS_DATA[0])}
              >
                Return to Kynetra Central
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Diagnostics / Platform HUD Section */}
      <section id="diagnostics" className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Platform Diagnostics & System HUD</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Core micro-engines and health monitoring services.
            </p>
          </div>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            API: http://localhost:4000
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>API Service (@kynetra/api)</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                200 OK
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Health Check: /health/ready
            </span>
          </div>

          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>World State Engine</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                Authoritative
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Synchronized with 4 Districts
            </span>
          </div>

          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>AI Gateway Runtime</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                Ready
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Aria Receptionist agent bound
            </span>
          </div>

          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Realtime Gateway (Go)</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Phase 03 Target
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Criteria per ADR-0008
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
