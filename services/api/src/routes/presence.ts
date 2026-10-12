import type { FastifyInstance } from 'fastify';
import {
  SpatialPeerSchema,
  type SpatialPeer,
  type SpatialZone,
} from '@kynetra/contracts';

export const CANONICAL_SPATIAL_ZONES: SpatialZone[] = [
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
  {
    id: 'zone-admin-suite',
    name: 'Executive Admin Workspace',
    type: 'workstation',
    color: '#f59e0b',
    description: 'High-clearance executive workspace with user management & RBAC master terminal.',
    bounds: { minX: 4, maxX: 12, minZ: 5, maxZ: 12 },
  },
];

// In-memory active peer store for real-time coordination
const activePeers = new Map<string, SpatialPeer>();

export async function presenceRoutes(app: FastifyInstance) {
  // 1. Get canonical spatial zones
  app.get('/api/v1/presence/zones', async () => {
    return { zones: CANONICAL_SPATIAL_ZONES };
  });

  // 2. Get active online peers
  app.get('/api/v1/presence/peers', async () => {
    const now = Date.now();
    // Prune peers inactive for more than 45 seconds
    for (const [id, peer] of activePeers.entries()) {
      if (now - (peer.lastActive || 0) > 45000) {
        activePeers.delete(id);
      }
    }
    return { peers: Array.from(activePeers.values()) };
  });


  // 3. Register or heartbeat peer presence
  app.post('/api/v1/presence/heartbeat', async (request, reply) => {
    const parse = SpatialPeerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Invalid peer payload', details: parse.error.issues });
    }
    const peer = { ...parse.data, lastActive: Date.now() };
    activePeers.set(peer.peerId, peer);
    return { success: true, peer };
  });
}
