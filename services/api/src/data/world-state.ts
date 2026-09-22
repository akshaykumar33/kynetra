import type {
  WorldDistrict,
  WorldStats,
  InnovationTowerFloor,
  InteractiveNode,
  LiveTelemetryMetric,
  IncidentSimulation,
  PatchSubmissionResponse,
  GamificationProfile,
  LeaderboardEntry,
  AiChatResponse,
} from '@kynetra/contracts';

export interface ActiveSession {
  sessionId: string;
  nodeId: string;
  connectedAt: string;
  userHandle: string;
}

export interface ActiveSimulation {
  id: string;
  scenarioId: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'running' | 'resolved';
  districtId: string;
  startedAt: string;
  resolvedAt?: string;
  errorRate: number; // e.g. 14.2%
  p99LatencyMs: number;
  dbPoolSaturation: number;
  rootCause: string;
  recommendedPatch: string;
}

export interface ActiveArenaMatch {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
}

class WorldStateManager {
  private districts: WorldDistrict[] = [
    {
      id: 'kynetra-central',
      name: 'Kynetra Central',
      theme: 'Civic & Headquarters',
      description: 'The civic core of Kynetra. Features Central Plaza, civic forums, and the Innovation Tower.',
      coordinates: { x: 0, y: 0 },
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Innovation Tower',
      floors: [
        {
          floorNumber: 1,
          name: 'Lobby & Reception',
          category: 'lobby',
          description: 'Grand reception concourse with AI Receptionist and fast-travel portals.',
          capacity: 250,
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-reception-desk',
              name: 'Aria (AI Receptionist)',
              type: 'receptionist_npc',
              position: { x: 0, y: 1.5, z: -5 },
              description: 'Intelligent concierge guiding developers to floors and arenas.',
              activeSessionCount: 0,
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
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-arena-pod-1',
              name: 'Battle Pod Alpha',
              type: 'coding_pod',
              position: { x: -8, y: 1, z: 4 },
              description: 'Competitive dual-terminal coding pod with automated test runner.',
              activeSessionCount: 0,
            },
            {
              id: 'node-arena-pod-2',
              name: 'Battle Pod Beta',
              type: 'coding_pod',
              position: { x: 8, y: 1, z: 4 },
              description: 'Real-time algorithm competition station with telemetry display.',
              activeSessionCount: 0,
            },
            {
              id: 'node-arena-whiteboard',
              name: 'System Architecture Board',
              type: 'whiteboard',
              position: { x: 0, y: 2, z: 8 },
              description: 'Collaborative real-time diagramming canvas.',
              activeSessionCount: 0,
            },
          ],
        },
        {
          floorNumber: 8,
          name: 'Cloud Infrastructure & SRE Lab',
          category: 'cloud_lab',
          description: 'Interactive server racks, live telemetry boards, and simulated outages.',
          capacity: 80,
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-cloud-rack-01',
              name: 'Simulated Kubernetes Cluster Rack',
              type: 'cloud_lab_rack',
              position: { x: 6, y: 1.5, z: 0 },
              description: 'Physical cluster replica with live circuit breaker controls.',
              activeSessionCount: 0,
            },
            {
              id: 'node-sre-terminal',
              name: 'NOC Incident Response Terminal',
              type: 'terminal',
              position: { x: -6, y: 1, z: 0 },
              description: 'Real-time observability console and chaos engineering triggers.',
              activeSessionCount: 0,
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
      activeUsers: 0,
      keyLandmark: 'Open Source Guild Hall',
      floors: [
        {
          floorNumber: 1,
          name: 'Guild Hall Commons',
          category: 'workspace',
          description: 'Open collaborative hall for distributed project maintainers.',
          capacity: 150,
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-dev-collab-1',
              name: 'Git Contributor Workstation',
              type: 'terminal',
              position: { x: -4, y: 1, z: 0 },
              description: 'Code review hub and monorepo build runner.',
              activeSessionCount: 0,
            },
            {
              id: 'node-dev-registry',
              name: 'Package Registry Mirror',
              type: 'cloud_lab_rack',
              position: { x: 4, y: 1, z: 2 },
              description: 'Artifact caching node with dependency vulnerability scanner.',
              activeSessionCount: 0,
            },
          ],
        },
        {
          floorNumber: 2,
          name: 'Compiler & Runtime Workshop',
          category: 'workspace',
          description: 'Low-level benchmarking suites, WebAssembly runtimes, and JIT compilers.',
          capacity: 80,
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-compiler-bench',
              name: 'Rust Toolchain Bench',
              type: 'terminal',
              position: { x: 0, y: 1, z: -3 },
              description: 'High-concurrency compilation runner with micro-benchmarks.',
              activeSessionCount: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'ai-research-district',
      name: 'AI Research District',
      theme: 'Intelligence & Simulation',
      description: 'Neural training clusters, agent laboratories, and synthetic personality testing grounds.',
      coordinates: { x: -180, y: 220 },
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Neural Foundry',
      floors: [
        {
          floorNumber: 1,
          name: 'Neural Foundry Concourse',
          category: 'workspace',
          description: 'Central AI research forum with model checkpoint evaluation pods.',
          capacity: 120,
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-ai-evaluator',
              name: 'Model Benchmark Pod',
              type: 'terminal',
              position: { x: -5, y: 1, z: 2 },
              description: 'Autonomous LLM evaluation and latency profiler.',
              activeSessionCount: 0,
            },
            {
              id: 'node-vector-cluster',
              name: 'pgvector Index Cluster',
              type: 'cloud_lab_rack',
              position: { x: 5, y: 1.5, z: -2 },
              description: 'High-dimension vector search engine with RAG telemetry.',
              activeSessionCount: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'cybersecurity-district',
      name: 'Cybersecurity District',
      theme: 'Defense & Offense Simulation',
      description: 'Red team/blue team battlegrounds, vulnerability ranges, and forensic sandbox chambers.',
      coordinates: { x: -300, y: -150 },
      status: 'active',
      activeUsers: 0,
      keyLandmark: 'Zero Trust Citadel',
      floors: [
        {
          floorNumber: 1,
          name: 'Security Operations Center (SOC)',
          category: 'workspace',
          description: 'Live SIEM threat intelligence boards and intrusion alerts.',
          capacity: 100,
          currentOccupancy: 0,
          nodes: [
            {
              id: 'node-soc-console',
              name: 'SOC Threat Defense Console',
              type: 'terminal',
              position: { x: -4, y: 1, z: 0 },
              description: 'SIEM anomaly detector and firewall rule validator.',
              activeSessionCount: 0,
            },
            {
              id: 'node-honeynet-rack',
              name: 'Honeypot Sandbox Cluster',
              type: 'cloud_lab_rack',
              position: { x: 4, y: 1.5, z: 1 },
              description: 'Isolated decoy environment capturing simulated cyber attacks.',
              activeSessionCount: 0,
            },
          ],
        },
      ],
    },
  ];

  private activeSessions: Map<string, ActiveSession> = new Map();
  private activeSimulations: Map<string, ActiveSimulation> = new Map();
  private activeMatches: Map<string, ActiveArenaMatch> = new Map();
  private serverStartTime = Date.now();

  public getDistricts(): WorldDistrict[] {
    return this.districts;
  }

  public getDistrict(id: string): WorldDistrict | undefined {
    return this.districts.find((d) => d.id === id);
  }

  public getStats(): WorldStats {
    const totalConnectedWorkstationUsers = Array.from(this.activeSessions.values()).length;
    const runningSimsCount = Array.from(this.activeSimulations.values()).filter(
      (s) => s.status === 'running'
    ).length;
    const activeMatchesCount = Array.from(this.activeMatches.values()).filter(
      (m) => m.status === 'in_progress'
    ).length;

    // Real total active developers: connected sessions + participants
    const totalOnline = totalConnectedWorkstationUsers + (activeMatchesCount * 2);

    // Calculate real uptime from process
    const uptimeSec = Math.floor((Date.now() - this.serverStartTime) / 1000);
    const availability = uptimeSec > 0 ? 100.0 : 99.99;

    return {
      totalOnlineDevelopers: totalOnline,
      activeSimulations: runningSimsCount,
      codingArenaMatches: activeMatchesCount,
      systemUptimePercentage: availability,
      districtsActive: this.districts.filter((d) => d.status === 'active').length,
      lastUpdated: new Date().toISOString(),
    };
  }

  public connectWorkstation(nodeId: string, userHandle = 'developer'): {
    session: ActiveSession;
    node: InteractiveNode;
    districtId: string;
    floorNumber: number;
  } {
    let foundNode: InteractiveNode | null = null;
    let foundFloor: InnovationTowerFloor | null = null;
    let foundDistrict: WorldDistrict | null = null;

    for (const d of this.districts) {
      if (!d.floors) continue;
      for (const f of d.floors) {
        const n = f.nodes.find((node) => node.id === nodeId);
        if (n) {
          foundNode = n;
          foundFloor = f;
          foundDistrict = d;
          break;
        }
      }
      if (foundNode) break;
    }

    if (!foundNode || !foundFloor || !foundDistrict) {
      throw new Error(`Workstation node '${nodeId}' not found.`);
    }

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const session: ActiveSession = {
      sessionId,
      nodeId,
      connectedAt: new Date().toISOString(),
      userHandle,
    };

    this.activeSessions.set(sessionId, session);
    foundNode.activeSessionCount += 1;
    foundFloor.currentOccupancy += 1;
    foundDistrict.activeUsers += 1;

    return {
      session,
      node: foundNode,
      districtId: foundDistrict.id,
      floorNumber: foundFloor.floorNumber,
    };
  }

  public disconnectWorkstation(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    this.activeSessions.delete(sessionId);

    // Find node and decrement counts
    for (const d of this.districts) {
      if (!d.floors) continue;
      for (const f of d.floors) {
        const n = f.nodes.find((node) => node.id === session.nodeId);
        if (n) {
          n.activeSessionCount = Math.max(0, n.activeSessionCount - 1);
          f.currentOccupancy = Math.max(0, f.currentOccupancy - 1);
          d.activeUsers = Math.max(0, d.activeUsers - 1);
          return true;
        }
      }
    }
    return true;
  }

  public executeWorkstationCommand(nodeId: string, command: string): {
    command: string;
    output: string;
    status: 'success' | 'error';
    timestamp: string;
  } {
    const cmd = command.trim().toLowerCase();
    const timestamp = new Date().toISOString();

    switch (cmd) {
      case 'status':
      case 'health':
        return {
          command,
          output: `[Node: ${nodeId}] Status: OPERATIONAL | Latency: 4ms | Host: kynetra-node-worker | Memory: 142MB / 512MB`,
          status: 'success',
          timestamp,
        };
      case 'ping':
        return {
          command,
          output: `PING kynetra-gateway (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.821 ms\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.744 ms\n--- round-trip min/avg/max = 0.744/0.782/0.821 ms ---`,
          status: 'success',
          timestamp,
        };
      case 'htop':
        return {
          command,
          output: `PID  USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 101 node       20   0  512.2M  74.5M  32.1M S   2.4   7.2   0:45.12 fastify-worker\n 102 postgres   20   0  1.024G 184.2M  64.0M S  28.6  18.1   2:12.80 postgres: pool\n 103 redis      20   0  128.0M  32.1M  16.0M S   1.1   3.1   0:15.04 redis-server\n 104 rust-sim   20   0   64.0M  12.8M   8.4M S   0.5   1.2   0:04.91 sim-scheduler`,
          status: 'success',
          timestamp,
        };
      case 'diagnose-pool':
        const activeSim = Array.from(this.activeSimulations.values()).find((s) => s.status === 'running');
        if (activeSim && activeSim.scenarioId === 'db-starvation') {
          return {
            command,
            output: `[CRITICAL ANOMALY DETECTED]\nService: services/api (Fastify + PostgreSQL 16)\nDB Pool Max: 10 connections\nDB Active: 10 connections (100% SATURATED - POOL EXHAUSTION)\nWaiting Requests: 42 in queue\np99 Latency: ${activeSim.p99LatencyMs}ms\n5xx Error Rate: ${activeSim.errorRate}%\nRoot Cause: Unclosed transaction leak in billing worker queue.\nRemediation: Run 'apply-patch --max-pool 50 --timeout 5000' to expand pool & evict stale clients.`,
            status: 'error',
            timestamp,
          };
        }
        return {
          command,
          output: `[DB HEALTH NOMINAL]\nPool Max: 50 | Active: 3 | Idle: 47 | Waiting: 0\np99 Latency: 12ms | Error Rate: 0.01%\nNo connection leaks detected.`,
          status: 'success',
          timestamp,
        };
      case 'apply-patch':
      case 'apply-patch --max-pool 50 --timeout 5000':
      case 'apply-patch --max-pool 50 --timeout 5000ms':
        const simToPatch = Array.from(this.activeSimulations.values()).find((s) => s.status === 'running');
        if (simToPatch) {
          const res = this.submitPatch(simToPatch.id, 'developer', { maxConnections: 50, connectionTimeoutMs: 5000 });
          return {
            command,
            output: `[PATCH APPLIED SUCCESSFULLY]\n${res.message}\nError rate normalized: ${res.metricsBefore.errorRate}% -> ${res.metricsAfter.errorRate}%\np99 Latency: ${res.metricsBefore.p99LatencyMs}ms -> ${res.metricsAfter.p99LatencyMs}ms\nXP Awarded: +${res.xpAwarded} XP\nBadge Unlocked: ${res.badgeUnlocked || 'None'}`,
            status: 'success',
            timestamp,
          };
        }
        return {
          command,
          output: `Configuration patch applied. All systems stable.`,
          status: 'success',
          timestamp,
        };
      case 'run-tests':
        return {
          command,
          output: `Running test suite for [${nodeId}]...\nPASS src/contract.spec.ts (4 tests)\nPASS src/runtime.spec.ts (3 tests)\nAll 7 tests completed successfully (0.42s). Zero regressions.`,
          status: 'success',
          timestamp,
        };
      case 'inspect':
        return {
          command,
          output: `NODE METRICS:\nActive Sessions: ${this.activeSessions.size}\nRunning Simulations: ${this.activeSimulations.size}\nProcess Uptime: ${Math.floor((Date.now() - this.serverStartTime) / 1000)}s`,
          status: 'success',
          timestamp,
        };
      case 'help':
        return {
          command,
          output: `Available commands:\n  status         - View worker health and memory\n  ping           - Gateway round-trip ping\n  htop           - View top running processes\n  diagnose-pool  - Analyze PostgreSQL connection pool\n  apply-patch    - Mitigate and patch active incident\n  run-tests      - Run local test suite\n  inspect        - Active sessions & simulator telemetry\n  help           - Show command manual`,
          status: 'success',
          timestamp,
        };
      default:
        if (cmd.startsWith('apply-patch')) {
          const sim = Array.from(this.activeSimulations.values()).find((s) => s.status === 'running');
          if (sim) {
            const res = this.submitPatch(sim.id, 'developer', { maxConnections: 50 });
            return {
              command,
              output: `[PATCH APPLIED] ${res.message} (+${res.xpAwarded} XP)`,
              status: 'success',
              timestamp,
            };
          }
        }
        return {
          command,
          output: `[${cmd}]: Command executed in sandbox environment. Exit code 0.`,
          status: 'success',
          timestamp,
        };
    }
  }

  public getActiveSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  public startSimulation(scenarioId: string, districtId = 'kynetra-central'): ActiveSimulation {
    const scenarios: Record<string, {
      name: string;
      severity: ActiveSimulation['severity'];
      errorRate: number;
      p99LatencyMs: number;
      dbPoolSaturation: number;
      rootCause: string;
      recommendedPatch: string;
    }> = {
      'db-starvation': {
        name: 'PostgreSQL Connection Starvation',
        severity: 'critical',
        errorRate: 18.4,
        p99LatencyMs: 2750,
        dbPoolSaturation: 0.98,
        rootCause: 'Connection leak in billing worker queue exhausts 10/10 connection slots.',
        recommendedPatch: 'Scale pool max to 50 and set connectionTimeoutMs to 5000.',
      },
      'traffic-spike': {
        name: 'Layer 7 Synthetic Request Surge',
        severity: 'high',
        errorRate: 12.1,
        p99LatencyMs: 1850,
        dbPoolSaturation: 0.72,
        rootCause: 'Ingress surge of 15,000 req/s overwhelms synchronous JSON parsers.',
        recommendedPatch: 'Enable Redis cache-aside and circuit breaker threshold at 1000ms.',
      },
      'cascading-timeout': {
        name: 'Cascading Microservice Timeout',
        severity: 'high',
        errorRate: 9.6,
        p99LatencyMs: 1420,
        dbPoolSaturation: 0.60,
        rootCause: 'Downstream auth provider latency causes upstream thread starvation.',
        recommendedPatch: 'Enable fallback circuit breaker and degrade auth gracefully.',
      },
      'memory-leak': {
        name: 'Worker Heap Allocation Leak',
        severity: 'medium',
        errorRate: 6.4,
        p99LatencyMs: 890,
        dbPoolSaturation: 0.45,
        rootCause: 'Unbounded event listener registration in real-time telemetry stream.',
        recommendedPatch: 'Evict stale listeners on websocket disconnect.',
      },
    };

    const cfg = scenarios[scenarioId] || scenarios['db-starvation'];
    const id = `sim-${Date.now()}`;
    const sim: ActiveSimulation = {
      id,
      scenarioId,
      name: cfg.name,
      severity: cfg.severity,
      status: 'running',
      districtId,
      startedAt: new Date().toISOString(),
      errorRate: cfg.errorRate,
      p99LatencyMs: cfg.p99LatencyMs,
      dbPoolSaturation: cfg.dbPoolSaturation,
      rootCause: cfg.rootCause,
      recommendedPatch: cfg.recommendedPatch,
    };

    this.activeSimulations.set(id, sim);
    return sim;
  }

  public submitPatch(
    simulationId: string,
    userHandle = 'developer',
    patchConfig: { maxConnections?: number; connectionTimeoutMs?: number; circuitBreakerEnabled?: boolean } = {}
  ): PatchSubmissionResponse {
    const sim = this.activeSimulations.get(simulationId);
    if (!sim || sim.status !== 'running') {
      return {
        success: false,
        simulationId,
        status: 'rejected',
        message: 'Simulation is either not found or already resolved.',
        metricsBefore: { errorRate: 0, p99LatencyMs: 0 },
        metricsAfter: { errorRate: 0, p99LatencyMs: 0 },
        xpAwarded: 0,
      };
    }

    const before = {
      errorRate: sim.errorRate,
      p99LatencyMs: sim.p99LatencyMs,
    };

    // Apply patch effects
    sim.status = 'resolved';
    sim.resolvedAt = new Date().toISOString();
    sim.errorRate = 0.01;
    sim.p99LatencyMs = 12;
    sim.dbPoolSaturation = 0.12;

    // Update user profile in gamification
    const profile = this.getGamificationProfile(userHandle);
    profile.currentXp += 500;
    profile.stats.incidentsResolved += 1;
    profile.stats.codePatchesSubmitted += 1;

    let badgeUnlocked: string | undefined;
    if (!profile.badges.some((b) => b.id === 'badge-pool-hero')) {
      const newBadge = {
        id: 'badge-pool-hero',
        name: 'Pool Starvation Hero',
        description: 'Successfully mitigated a critical database pool exhaustion incident.',
        icon: '🛡️',
        category: 'sre' as const,
        unlockedAt: new Date().toISOString(),
      };
      profile.badges.push(newBadge);
      badgeUnlocked = 'Pool Starvation Hero';
    }

    // Check level up
    if (profile.currentXp >= profile.nextLevelXp) {
      profile.level += 1;
      profile.nextLevelXp += 1500;
      profile.rankTitle = 'Lead Site Reliability Architect';
    }

    return {
      success: true,
      simulationId,
      status: 'resolved',
      message: `Patch verified and applied: Database connection pool scaled to 50 connections with 5000ms idle timeout. Incident mitigated in 0.24s.`,
      metricsBefore: before,
      metricsAfter: {
        errorRate: 0.01,
        p99LatencyMs: 12,
      },
      xpAwarded: 500,
      badgeUnlocked,
    };
  }

  public stopSimulation(id: string): boolean {
    const sim = this.activeSimulations.get(id);
    if (!sim) return false;
    sim.status = 'resolved';
    sim.resolvedAt = new Date().toISOString();
    this.activeSimulations.delete(id);
    return true;
  }

  public clearAllSimulations(): number {
    const count = this.activeSimulations.size;
    this.activeSimulations.clear();
    return count;
  }

  public getSimulations(activeOnly = true): ActiveSimulation[] {
    const all = Array.from(this.activeSimulations.values());
    return activeOnly ? all.filter((s) => s.status === 'running') : all;
  }

  public getLiveTelemetry(): LiveTelemetryMetric {
    const activeRunning = Array.from(this.activeSimulations.values()).filter((s) => s.status === 'running');
    const isIncident = activeRunning.length > 0;

    if (isIncident) {
      const highestSim = activeRunning[0];
      return {
        timestamp: new Date().toISOString(),
        cpuUsagePercent: +(72 + Math.random() * 20).toFixed(1),
        memoryUsagePercent: +(68 + Math.random() * 15).toFixed(1),
        dbPoolActiveConnections: 10,
        dbPoolMaxConnections: 10,
        p99LatencyMs: Math.round(highestSim.p99LatencyMs + (Math.random() * 200 - 100)),
        errorRate5xx: +(highestSim.errorRate + (Math.random() * 2 - 1)).toFixed(2),
        requestsPerSecond: Math.round(12500 + Math.random() * 2000),
        activeIncidents: activeRunning.length,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      cpuUsagePercent: +(18 + Math.random() * 8).toFixed(1),
      memoryUsagePercent: +(42 + Math.random() * 5).toFixed(1),
      dbPoolActiveConnections: 3,
      dbPoolMaxConnections: 50,
      p99LatencyMs: +(12 + Math.random() * 6).toFixed(1),
      errorRate5xx: 0.01,
      requestsPerSecond: Math.round(1450 + Math.random() * 150),
      activeIncidents: 0,
    };
  }

  private userProfiles: Map<string, GamificationProfile> = new Map([
    [
      'developer',
      {
        id: 'usr-dev-1',
        handle: 'developer',
        displayName: 'Neo Developer',
        role: 'employee',
        level: 5,
        currentXp: 1850,
        nextLevelXp: 2500,
        rankTitle: 'Staff Systems Engineer',
        avatarColor: '#38bdf8',
        badges: [
          {
            id: 'badge-first-login',
            name: 'Kynetra Pioneer',
            description: 'Initiated first session in the Innovation Tower.',
            icon: '🏙️',
            category: 'community',
            unlockedAt: new Date().toISOString(),
          },
          {
            id: 'badge-terminal-master',
            name: 'Shell Commander',
            description: 'Executed over 25 workstation shell diagnostics.',
            icon: '📟',
            category: 'backend',
            unlockedAt: new Date().toISOString(),
          },
        ],
        stats: {
          incidentsResolved: 3,
          arenaMatchesWon: 2,
          codePatchesSubmitted: 8,
          uptimeContributionHours: 24,
        },
      },
    ],
  ]);

  public getGamificationProfile(handle = 'developer'): GamificationProfile {
    let profile = this.userProfiles.get(handle);
    if (!profile) {
      profile = {
        id: `usr-${handle}`,
        handle,
        displayName: handle.charAt(0).toUpperCase() + handle.slice(1),
        role: 'employee',
        level: 1,
        currentXp: 200,
        nextLevelXp: 1000,
        rankTitle: 'Junior Systems Engineer',
        avatarColor: '#a855f7',
        badges: [],
        stats: {
          incidentsResolved: 0,
          arenaMatchesWon: 0,
          codePatchesSubmitted: 0,
          uptimeContributionHours: 1,
        },
      };
      this.userProfiles.set(handle, profile);
    }
    return profile;
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const dev = this.getGamificationProfile('developer');
    return [
      {
        rank: 1,
        handle: 'elena_sre',
        displayName: 'Elena Rostova',
        level: 18,
        totalXp: 8940,
        incidentsResolved: 34,
        rankTitle: 'Distinguished SRE Fellow',
        districtAffiliation: 'Cloud & SRE District',
      },
      {
        rank: 2,
        handle: 'marcus_k8s',
        displayName: 'Marcus Vance',
        level: 14,
        totalXp: 6200,
        incidentsResolved: 21,
        rankTitle: 'Principal Cloud Architect',
        districtAffiliation: 'Kynetra Central',
      },
      {
        rank: 3,
        handle: dev.handle,
        displayName: dev.displayName,
        level: dev.level,
        totalXp: dev.currentXp,
        incidentsResolved: dev.stats.incidentsResolved,
        rankTitle: dev.rankTitle,
        districtAffiliation: 'Innovation Tower Floor 8',
      },
      {
        rank: 4,
        handle: 'sarah_ai',
        displayName: 'Sarah Lin',
        level: 4,
        totalXp: 1520,
        incidentsResolved: 2,
        rankTitle: 'AI Research Associate',
        districtAffiliation: 'AI Research District',
      },
      {
        rank: 5,
        handle: 'dave_sec',
        displayName: 'Dave K.',
        level: 3,
        totalXp: 1100,
        incidentsResolved: 1,
        rankTitle: 'Security Analyst I',
        districtAffiliation: 'Cybersecurity District',
      },
    ];
  }

  public askAria(
    message: string,
    topic = 'general',
    floorNumber = 1
  ): AiChatResponse {
    const lower = message.toLowerCase();
    const timestamp = new Date().toISOString();

    if (lower.includes('pool') || lower.includes('starvation') || lower.includes('504') || lower.includes('database')) {
      return {
        reply: `**Database Connection Pool Starvation Detected**\n\nWhen high-concurrency workloads spike without a connection timeout or connection pooling proxy (like PgBouncer), unclosed transactions leak connection handles. The pool hits 100% capacity (10/10), causing incoming HTTP requests to wait until they hit 504 Gateway Timeout.\n\n**Remediation Steps:**\n1. At your workstation, run \`diagnose-pool\` to view active leases.\n2. Scale the pool to 50 connections with \`apply-patch --max-pool 50 --timeout 5000ms\`.\n3. The SRE incident engine will verify the fix and award +500 XP.`,
        sender: 'Aria (AI Concierge)',
        suggestedActions: [
          'Run diagnose-pool',
          'Apply patch (--max-pool 50)',
          'View Floor 8 Cloud Lab',
        ],
        relevantDocs: [
          'docs/10-runbooks/db-pool-exhaustion.md',
          'docs/08-decisions/ADR-0005-database-and-caching.md',
        ],
        timestamp,
      };
    }

    if (lower.includes('floor') || lower.includes('tower') || lower.includes('innovation')) {
      return {
        reply: `**Innovation Tower Directory**\n\n- **Floor 1 (Lobby & Reception)**: You are here! Welcome concourse, Aria concierge pod, fast-travel portals.\n- **Floor 4 (Algorithmic Coding Arena)**: Multiplayer battle pods Alpha & Beta with live test runner and architectural whiteboard.\n- **Floor 8 (Cloud Infrastructure & SRE Lab)**: Kubernetes rack replicas, live telemetry monitors, and the NOC Incident Response terminal.\n- **Floor 12 (AI Research & Autonomous Agents)**: Autonomous agent labs and neural cluster index.`,
        sender: 'Aria (AI Concierge)',
        suggestedActions: [
          'Fast travel to Floor 4 (Arena)',
          'Fast travel to Floor 8 (SRE Lab)',
          'Toggle 3D Viewport',
        ],
        relevantDocs: [
          'docs/01-product/world-experience.md',
          'docs/01-product/3d-experience.md',
        ],
        timestamp,
      };
    }

    if (lower.includes('arch') || lower.includes('stack') || lower.includes('tech') || lower.includes('adr')) {
      return {
        reply: `**Kynetra Architecture Highlights**\n\nKynetra follows a **procedurally realistic modular monolith**:\n- **Client**: 3D WebGL/WebGPU spatial viewport (Three.js) paired with Next.js 15 App Router.\n- **Backend**: Fastify API service with strict TypeScript contracts in \`packages/contracts\`.\n- **Data**: PostgreSQL 16 + pgvector, Redis 7 caching, and OpenTelemetry tracing.\n- **Procedural Engine**: Real Linux terminals, simulated cascading failures, and deterministic replays.`,
        sender: 'Aria (AI Concierge)',
        suggestedActions: [
          'Read ADR-0002 Modular Monolith',
          'Read ADR-0006 3D Browser Runtime',
          'Open Workstation Terminal',
        ],
        relevantDocs: [
          'docs/02-architecture/overview.md',
          'docs/08-decisions/ADR-0002-modular-monolith-first.md',
        ],
        timestamp,
      };
    }

    return {
      reply: `Greetings! I am Aria, your AI concierge and mentor in Kynetra. You can walk around the office using **WASD**, dock into any workstation to execute shell commands, or trigger realistic SRE incident simulations from Floor 8. How can I assist your engineering session today?`,
      sender: 'Aria (AI Concierge)',
      suggestedActions: [
        'How do I fix connection pool starvation?',
        'Show Innovation Tower floor directory',
        'Explain Kynetra tech stack',
      ],
      relevantDocs: [
        'docs/00-vision/product-vision.md',
        'docs/01-product/product-requirements.md',
      ],
      timestamp,
    };
  }


  public startArenaMatch(problemTitle: string, difficulty: ActiveArenaMatch['difficulty'], language = 'TypeScript'): ActiveArenaMatch {
    const id = `match-${Date.now()}`;
    const match: ActiveArenaMatch = {
      id,
      title: problemTitle,
      difficulty,
      language,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };
    this.activeMatches.set(id, match);
    return match;
  }

  public stopArenaMatch(id: string): boolean {
    const match = this.activeMatches.get(id);
    if (!match) return false;
    match.status = 'completed';
    this.activeMatches.delete(id);
    return true;
  }

  public getArenaMatches(): ActiveArenaMatch[] {
    return Array.from(this.activeMatches.values());
  }

  public addNode(
    districtId: string,
    floorNumber: number,
    name: string,
    nodeType: InteractiveNode['type'],
    description: string
  ): InteractiveNode {
    const district = this.districts.find((d) => d.id === districtId);
    if (!district || !district.floors) {
      throw new Error(`District '${districtId}' not found or has no floors.`);
    }

    const floor = district.floors.find((f) => f.floorNumber === floorNumber);
    if (!floor) {
      throw new Error(`Floor '${floorNumber}' not found in district '${districtId}'.`);
    }

    const id = `node-${nodeType}-${Date.now()}`;
    const newNode: InteractiveNode = {
      id,
      name,
      type: nodeType,
      position: {
        x: +(Math.random() * 16 - 8).toFixed(1),
        y: 1,
        z: +(Math.random() * 16 - 8).toFixed(1),
      },
      description,
      activeSessionCount: 0,
    };

    floor.nodes.push(newNode);
    return newNode;
  }
}

export const worldState = new WorldStateManager();
