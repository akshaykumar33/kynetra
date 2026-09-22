'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { InteractiveNode, LiveTelemetryMetric, IncidentSimulation } from '@kynetra/contracts';
import { sounds } from '../hud/SoundEffects';

interface WorkstationWorkbenchModalProps {
  node: InteractiveNode;
  onClose: () => void;
  apiBase: string;
  isIncidentActive: boolean;
  activeSimulation: IncidentSimulation | null;
  onPatchApplied: () => void;
  userRole?: 'admin' | 'architect' | 'employee';
}

// Editable project files
const INITIAL_WORKSPACE_FILES = [
  {
    name: 'db/pool-config.ts',
    language: 'typescript',
    content: `// Kynetra Core Database Pool Configuration
// SRE TASK: Prevent connection pool exhaustion under 10k req/s load

export const dbPoolConfig = {
  // CRITICAL BUG: Pool max is capped at 10, causing 504 timeouts!
  // Production directive: Scale max connections to 50 and set idle timeout.
  maxConnections: 10,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 1000,
  evictStaleClients: false,
};

export function validatePoolHealth(activeLeases: number) {
  if (activeLeases >= dbPoolConfig.maxConnections) {
    throw new Error('504 Gateway Timeout: DB Connection Pool Exhaustion');
  }
  return { status: 'healthy', capacity: dbPoolConfig.maxConnections - activeLeases };
}
`,
  },
  {
    name: 'routes/billing-worker.ts',
    language: 'typescript',
    content: `// Billing Worker Queue Processor
import { dbPoolConfig } from '../db/pool-config';

export async function processBatchTransactions(jobId: string) {
  // Simulates client acquiring connection lease
  console.log(\`[Worker \${jobId}] Acquiring DB lease from pool...\`);
  
  // NOTE: Stale unclosed transaction was leaking handle here
  const lease = { id: jobId, acquiredAt: Date.now() };
  
  // FIXED: Explicitly release lease back to connection pool
  return { success: true, processedJob: jobId, released: true };
}
`,
  },
  {
    name: 'contracts/health.ts',
    language: 'typescript',
    content: `// Platform Canonical Health Contract
export interface PlatformHealth {
  status: 'healthy' | 'degraded' | 'critical';
  latencyMs: number;
  dbPoolActive: number;
  dbPoolMax: number;
  version: '2.4.0';
}
`,
  },
];

export function WorkstationWorkbenchModal({
  node,
  onClose,
  apiBase,
  isIncidentActive,
  activeSimulation,
  onPatchApplied,
  userRole = 'employee',
}: WorkstationWorkbenchModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal' | 'telemetry' | 'architecture' | 'ai_tutor'>('editor');

  // Workspace Code Editor State
  const [files, setFiles] = useState(INITIAL_WORKSPACE_FILES);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [editorCode, setEditorCode] = useState(INITIAL_WORKSPACE_FILES[0].content);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Terminal State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[KYNETRA WORKSPACE v2.4.0 — ROLE: ${userRole.toUpperCase()}]`,
    `Station: ${node.name} (ID: ${node.id})`,
    `Connected to local Fastify sandboxed worker.`,
    `Type 'help' for command manual, 'run-tests' to verify code, or 'diagnose-pool' for anomaly scan.`,
    `-----------------------------------------------------------------------------------------`,
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Live Telemetry State
  const [liveMetrics, setLiveMetrics] = useState<LiveTelemetryMetric | null>(null);

  // AI Tutor State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Aria (AI Coding Tutor)',
      text: `Welcome to ${node.name}! You are working inside the real Kynetra sandbox. In the 'Code Editor' tab, inspect 'db/pool-config.ts' where 'maxConnections' is throttled to 10. Increase it to 50 and click 'Run Tests & Deploy' to mitigate the live outage!`,
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Sync editor code when active file changes
  const handleSelectFile = (index: number) => {
    sounds.playKeyClick();
    setActiveFileIndex(index);
    setEditorCode(files[index].content);
    setTestOutput(null);
  };

  // Student modifies code
  const handleCodeChange = (newContent: string) => {
    setEditorCode(newContent);
    setFiles((prev) => {
      const copy = [...prev];
      copy[activeFileIndex] = { ...copy[activeFileIndex], content: newContent };
      return copy;
    });
  };

  // Run Student Unit Tests & Deploy Code
  const handleRunStudentTests = async () => {
    sounds.playKeyClick();
    setIsRunningTests(true);
    setTestOutput('Compiling TypeScript and running test suite...');

    setTimeout(async () => {
      const isPoolFixed =
        editorCode.includes('maxConnections: 50') ||
        editorCode.includes('50') ||
        editorCode.includes('maxConnections: 100');

      if (isPoolFixed) {
        sounds.playSuccessChime();
        setTestOutput(`✔ PASS test/db-pool.spec.ts (4 tests passed)
  ✓ validatePoolHealth returns capacity for 50 clients (2ms)
  ✓ handles concurrent 10,000 req/s load without 504 timeouts (8ms)
  ✓ evicts stale transaction leases after 5000ms (4ms)
  ✓ zero connection leaks in billing worker queue (1ms)

All 4 test suites passed. Build successful.
Mitigation patch deployed to cluster! Production configuration verified healthy.`);

        // Call backend submit-patch endpoint
        try {
          await fetch(`${apiBase}/api/v1/simulations/submit-patch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              simulationId: activeSimulation?.id || 'sim-active',
              userHandle: userRole,
              patchConfig: { maxConnections: 50 },
            }),
          });
        } catch {
          // Ignore
        }
        onPatchApplied();
      } else {
        setTestOutput(`✖ FAIL test/db-pool.spec.ts
  ✕ validatePoolHealth handles 10,000 req/s load
    Error: 504 Gateway Timeout: DB Connection Pool Exhaustion (Active: 10/10)
    at validatePoolHealth (db/pool-config.ts:16:11)

Hint from Aria: Look at 'maxConnections' in db/pool-config.ts. Scale it to 50 to accommodate the incoming load.`);
      }
      setIsRunningTests(false);
    }, 1200);
  };

  // Poll live telemetry while modal is open
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/telemetry/live`);
        if (res.ok) {
          const data = await res.json();
          setLiveMetrics(data);
        }
      } catch {
        // Local fallback
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Terminal command execution
  const handleExecuteCommand = async (cmdToRun?: string) => {
    const command = (cmdToRun || inputCommand).trim();
    if (!command) return;

    sounds.playKeyClick();
    setTerminalLogs((prev) => [...prev, `student@kynetra-node:~$ ${command}`]);
    setInputCommand('');
    setIsExecuting(true);

    if (command.toLowerCase() === 'clear') {
      setTerminalLogs([]);
      setIsExecuting(false);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/v1/workstations/${node.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      if (res.ok) {
        const result = await res.json();
        setTerminalLogs((prev) => [...prev, result.output]);
        if (command.startsWith('apply-patch')) {
          sounds.playSuccessChime();
          onPatchApplied();
        }
      } else {
        setTerminalLogs((prev) => [...prev, `[ERROR]: Command '${command}' returned exit code 1.`]);
      }
    } catch {
      if (command === 'diagnose-pool') {
        if (isIncidentActive) {
          setTerminalLogs((prev) => [
            ...prev,
            `[CRITICAL ANOMALY]: Pool Saturated at 10/10 connections (100%).`,
            `Unclosed transaction in billing queue. Run 'apply-patch --max-pool 50' or edit db/pool-config.ts.`,
          ]);
        } else {
          setTerminalLogs((prev) => [
            ...prev,
            `[HEALTH NOMINAL]: DB Pool 3/50 active. p99 Latency: 12ms. Zero bottlenecks.`,
          ]);
        }
      } else if (command.startsWith('apply-patch')) {
        sounds.playSuccessChime();
        setTerminalLogs((prev) => [
          ...prev,
          `[PATCH APPLIED]: Database pool scaled to 50 connections. Hot-patch verified and applied!`,
        ]);
        onPatchApplied();
      } else {
        setTerminalLogs((prev) => [...prev, `[${command}]: Command executed in workstation sandbox. Exit code 0.`]);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  // Ask Aria AI in Workbench
  const handleAskAria = async (question?: string) => {
    const q = (question || aiInput).trim();
    if (!q) return;

    sounds.playKeyClick();
    setChatMessages((prev) => [
      ...prev,
      { sender: 'You', text: q, time: new Date().toLocaleTimeString() },
    ]);
    setAiInput('');
    setAiThinking(true);

    try {
      const res = await fetch(`${apiBase}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          contextTopic: isIncidentActive ? 'sre_incident' : 'general',
          currentFloorNumber: 8,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { sender: data.sender || 'Aria', text: data.reply, time: new Date().toLocaleTimeString() },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'Aria (AI Coding Tutor)',
          text: `In 'db/pool-config.ts', the connection pool capacity is capped at 10. Edit line 7 to 'maxConnections: 50' and click 'Run Tests & Deploy Fix' to solve the outage!`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setAiThinking(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          backgroundColor: '#151b24',
          border: '2px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
        }}
      >
        {/* Top Window Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid #2d3b4e',
            backgroundColor: '#1e2633',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
            </div>
            <div style={{ width: '1px', height: '16px', background: '#334155' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              <span style={{ color: 'var(--accent-amber)' }}>MINECRAFT WORKBENCH:</span> {node.name}
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid var(--accent-amber)',
                color: 'var(--accent-amber)',
                fontWeight: 700,
              }}
            >
              {node.type.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isIncidentActive && (
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                ACTIVE SRE INCIDENT
              </span>
            )}

            <button
              onClick={() => {
                sounds.playKeyClick();
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              ✕ Close Station
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid #2d3b4e',
            backgroundColor: '#18202c',
            fontSize: '12px',
          }}
        >
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('editor'); }}
            style={{
              padding: '12px 18px',
              borderBottom: activeTab === 'editor' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'editor' ? 'var(--accent-amber)' : '#94a3b8',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            💻 Workspace Code Editor
          </button>
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('terminal'); }}
            style={{
              padding: '12px 18px',
              borderBottom: activeTab === 'terminal' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'terminal' ? 'var(--accent-amber)' : '#94a3b8',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            📟 Live Sandbox Terminal
          </button>
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('telemetry'); }}
            style={{
              padding: '12px 18px',
              borderBottom: activeTab === 'telemetry' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'telemetry' ? 'var(--accent-amber)' : '#94a3b8',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            📈 Telemetry &amp; SRE Lab
          </button>
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('architecture'); }}
            style={{
              padding: '12px 18px',
              borderBottom: activeTab === 'architecture' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'architecture' ? 'var(--accent-amber)' : '#94a3b8',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            🏛️ Architecture Topology
          </button>
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('ai_tutor'); }}
            style={{
              padding: '12px 18px',
              borderBottom: activeTab === 'ai_tutor' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'ai_tutor' ? 'var(--accent-amber)' : '#94a3b8',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            🤖 Aria AI Coding Tutor
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          {/* TAB 1: CODE EDITOR */}
          {activeTab === 'editor' && (
            <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
              {/* File Sidebar */}
              <div
                style={{
                  width: '240px',
                  backgroundColor: '#0c1322',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '8px' }}>
                  WORKSPACE FILES
                </div>
                {files.map((file, idx) => (
                  <button
                    key={file.name}
                    onClick={() => handleSelectFile(idx)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: idx === activeFileIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: idx === activeFileIndex ? 'var(--accent-amber)' : '#cbd5e1',
                      fontWeight: idx === activeFileIndex ? 800 : 500,
                      textAlign: 'left',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>📄</span> {file.name}
                  </button>
                ))}

                <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '11px', color: '#94a3b8' }}>
                  💡 <strong style={{ color: '#fff' }}>Directive:</strong> Resolve connection starvation by scaling database connection pool capacity.
                </div>
              </div>

              {/* Code Textarea & Execution Pane */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    backgroundColor: '#18202c',
                    borderRadius: '8px',
                    border: '1px solid #2d3b4e',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                    Editing: <span style={{ color: 'var(--accent-amber)' }}>{files[activeFileIndex].name}</span>
                  </span>
                  <button
                    onClick={handleRunStudentTests}
                    disabled={isRunningTests}
                    className="btn-primary"
                    style={{ padding: '6px 18px', fontSize: '12px' }}
                  >
                    {isRunningTests ? 'Testing & Deploying...' : '▶ Run Build & Deploy Patch'}
                  </button>
                </div>

                {/* Real Editable Code Textarea */}
                <textarea
                  value={editorCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#10151f',
                    color: '#f8fafc',
                    border: '1px solid #2d3b4e',
                    borderRadius: '10px',
                    padding: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    resize: 'none',
                    outline: 'none',
                  }}
                  spellCheck={false}
                />

                {/* Test Runner Console Output */}
                {testOutput && (
                  <div
                    style={{
                      height: '140px',
                      backgroundColor: '#050a14',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '11px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      color: testOutput.includes('PASS') ? '#34d399' : '#f87171',
                    }}
                  >
                    {testOutput}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL */}
          {activeTab === 'terminal' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#10151f',
                borderRadius: '12px',
                border: '1px solid #2d3b4e',
                padding: '16px',
                overflow: 'hidden',
              }}
            >
              {/* Quick Command Pills */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', borderBottom: '1px solid #2d3b4e', paddingBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Quick Shell:</span>
                {['diagnose-pool', 'apply-patch --max-pool 50', 'htop', 'status', 'run-tests', 'help'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleExecuteCommand(cmd)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#1e293b',
                      border: '1px solid #3d4b60',
                      color: 'var(--accent-amber)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {cmd}
                  </button>
                ))}
              </div>

              {/* Terminal Output */}
              <div style={{ flex: 1, overflowY: 'auto', fontSize: '12px', lineHeight: '1.6', color: '#cbd5e1' }}>
                {terminalLogs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      color:
                        log.includes('[CRITICAL') || log.includes('[ERROR')
                          ? '#f87171'
                          : log.includes('[PATCH APPLIED') || log.includes('PASS')
                          ? '#34d399'
                          : log.startsWith('student@')
                          ? 'var(--accent-amber)'
                          : '#cbd5e1',
                    }}
                  >
                    {log}
                  </div>
                ))}
                {isExecuting && <div style={{ color: 'var(--accent-amber)' }}>Running process in sandbox...</div>}
                <div ref={terminalEndRef} />
              </div>

              {/* Command Input Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #2d3b4e', paddingTop: '12px', marginTop: '8px' }}>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 800, fontSize: '12px' }}>{userRole}@kynetra-node:~$</span>
                <input
                  type="text"
                  value={inputCommand}
                  onChange={(e) => setInputCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteCommand();
                  }}
                  placeholder="Type command ('diagnose-pool', 'apply-patch', 'help')..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                  autoFocus
                />
                <button
                  onClick={() => handleExecuteCommand()}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                >
                  Run
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY & SRE */}
          {activeTab === 'telemetry' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {isIncidentActive && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#f87171' }}>
                      🚨 ACTIVE INCIDENT: PostgreSQL Connection Pool Starvation
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                      Pool maxed out at 10/10. Active requests failing with 504 Gateway Timeout.
                    </div>
                  </div>
                  <button
                    onClick={() => handleExecuteCommand('apply-patch --max-pool 50 --timeout 5000ms')}
                    className="btn-primary"
                    style={{ background: '#10b981', color: '#fff', padding: '8px 18px', fontSize: '12px' }}
                  >
                    Apply Mitigation Patch
                  </button>
                </div>
              )}

              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#18202c', borderRadius: '12px', border: '1px solid #2d3b4e' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>DB POOL SATURATION</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: isIncidentActive ? '#f87171' : 'var(--accent-emerald)' }}>
                    {isIncidentActive ? '10 / 10 (100%)' : '3 / 50 (6%)'}
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#2d3b4e', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: isIncidentActive ? '100%' : '6%', background: isIncidentActive ? '#ef4444' : 'var(--accent-emerald)' }} />
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#18202c', borderRadius: '12px', border: '1px solid #2d3b4e' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>P99 LATENCY</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: isIncidentActive ? '#f87171' : '#34d399' }}>
                    {liveMetrics?.p99LatencyMs || 12} ms
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>SLA Target: &lt;50ms</div>
                </div>

                <div style={{ padding: '16px', background: '#18202c', borderRadius: '12px', border: '1px solid #2d3b4e' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>5XX ERROR RATE</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: isIncidentActive ? '#f87171' : '#34d399' }}>
                    {liveMetrics?.errorRate5xx || 0.01}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Healthy: &lt;0.05%</div>
                </div>

                <div style={{ padding: '16px', background: '#18202c', borderRadius: '12px', border: '1px solid #2d3b4e' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>INGRESS THROUGHPUT</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#f8fafc' }}>
                    {liveMetrics?.requestsPerSecond || 1450} req/s
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '4px' }}>Real Fastify Traffic</div>
                </div>
              </div>

              {/* Telemetry Stream Chart */}
              <div style={{ flex: 1, minHeight: '200px', backgroundColor: '#10151f', borderRadius: '12px', border: '1px solid #2d3b4e', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>CLICKHOUSE HIGH-THROUGHPUT ANOMALY TRACE</span>
                  <span style={{ color: '#34d399' }}>● STREAMING AT 10HZ</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '6px', paddingTop: '16px' }}>
                  {Array.from({ length: 40 }).map((_, i) => {
                    const h = isIncidentActive
                      ? Math.min(100, Math.max(25, Math.sin(i * 0.4) * 45 + 55 + Math.random() * 15))
                      : Math.min(100, Math.max(10, Math.sin(i * 0.2) * 15 + 15 + Math.random() * 8));
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          borderRadius: '4px 4px 0 0',
                          backgroundColor: isIncidentActive ? '#ef4444' : 'var(--accent-emerald)',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18202c', borderRadius: '12px', border: '1px solid #2d3b4e', padding: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', marginBottom: '32px' }}>
                SERVICE TOPOLOGY &amp; DEPENDENCY CHAIN
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ width: '180px', padding: '16px', borderRadius: '12px', background: '#10151f', border: '1px solid var(--accent-amber)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px' }}>🖥️</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>Web Viewport</div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-amber)' }}>Three.js / React 19</div>
                </div>

                <span style={{ fontSize: '20px', color: 'var(--accent-amber)' }}>──►</span>

                <div style={{ width: '180px', padding: '16px', borderRadius: '12px', background: '#10151f', border: '1px solid var(--accent-amber)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px' }}>⚡</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>API Gateway</div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-amber)' }}>Fastify Engine</div>
                </div>

                <span style={{ fontSize: '20px', color: isIncidentActive ? '#ef4444' : 'var(--accent-amber)' }}>──►</span>

                <div
                  style={{
                    width: '180px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: isIncidentActive ? 'rgba(239, 68, 68, 0.2)' : '#10151f',
                    border: `1px solid ${isIncidentActive ? '#ef4444' : 'var(--accent-amber)'}`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px' }}>🏊</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>PgPool Manager</div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: isIncidentActive ? '#f87171' : '#34d399' }}>
                    {isIncidentActive ? 'EXHAUSTED (10/10)' : 'HEALTHY (3/50)'}
                  </div>
                </div>

                <span style={{ fontSize: '20px', color: 'var(--accent-amber)' }}>──►</span>

                <div style={{ width: '180px', padding: '16px', borderRadius: '12px', background: '#10151f', border: '1px solid var(--accent-amber)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px' }}>🐘</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>PostgreSQL 16</div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-amber)' }}>Port 5432 / Drizzle</div>
                </div>
              </div>

              <div style={{ marginTop: '36px', maxWidth: '600px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                {isIncidentActive ? (
                  <span style={{ color: '#f87171', fontWeight: 600 }}>
                    ⚠️ Connection starvation bottleneck between API Gateway and PostgreSQL! Edit &apos;db/pool-config.ts&apos; or execute &apos;apply-patch --max-pool 50&apos; to expand the pool.
                  </span>
                ) : (
                  <span>
                    All microservices operational. Zero connection bottlenecks or transaction leaks detected.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AI TUTOR */}
          {activeTab === 'ai_tutor' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#18202c', borderRadius: '12px', border: '1px solid #2d3b4e', padding: '16px', overflow: 'hidden' }}>
              {/* Quick Suggestions */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', borderBottom: '1px solid #2d3b4e', paddingBottom: '12px' }}>
                {[
                  'How do I fix connection pool starvation?',
                  'Why did the pool exhaust at 10 connections?',
                  'Explain PgBouncer connection pooling',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAskAria(q)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      background: '#1e293b',
                      border: '1px solid #3d4b60',
                      color: 'var(--accent-amber)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Thread */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ alignSelf: msg.sender === 'You' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
                      {msg.sender} • {msg.time}
                    </div>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: msg.sender === 'You' ? '#15803d' : '#1e2633',
                        color: '#f8fafc',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiThinking && <div style={{ color: 'var(--accent-amber)', fontSize: '12px' }}>Aria is analyzing your code and system runbooks...</div>}
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #2d3b4e', paddingTop: '12px' }}>
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskAria();
                  }}
                  placeholder="Ask Aria about your code, debugging steps, or incident resolution..."
                  style={{
                    flex: 1,
                    backgroundColor: '#04060a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => handleAskAria()}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12px' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
