import { describe, it, expect } from 'vitest';
import {
  SpatialPeerSchema,
  SpatialZoneSchema,
  SpatialChatMessageSchema,
  SpatialEmoteSchema,
} from './presence.js';

describe('Spatial Presence & WorkAdventure Replica Contracts', () => {
  it('validates a complete SpatialPeer with active media and position', () => {
    const validPeer = {
      peerId: 'peer-alpha-123',
      userId: 'user-456',
      name: 'Sarah Chen',
      role: 'architect' as const,
      position: { x: 5.2, y: 0, z: -3.8 },
      rotation: 1.57,
      zoneId: 'zone-agora',
      status: 'in_meeting' as const,
      mediaState: {
        micOn: true,
        cameraOn: true,
        screenSharing: false,
        speaking: true,
      },
      avatarColor: '#0ea5e9',
      lastActive: 1711100000,
    };

    const parsed = SpatialPeerSchema.safeParse(validPeer);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Sarah Chen');
      expect(parsed.data.role).toBe('architect');
      expect(parsed.data.mediaState.speaking).toBe(true);
    }
  });

  it('supplies defaults for optional peer media states and colors', () => {
    const minimalPeer = {
      peerId: 'peer-minimal',
      userId: 'user-min',
      name: 'Alex Rivera',
      position: { x: 0, y: 0, z: 0 },
    };

    const parsed = SpatialPeerSchema.safeParse(minimalPeer);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.role).toBe('employee');
      expect(parsed.data.status).toBe('online');
      expect(parsed.data.mediaState.micOn).toBe(false);
      expect(parsed.data.mediaState.speaking).toBe(false);
      expect(parsed.data.avatarColor).toBe('#0284c7');
    }
  });

  it('validates SpatialZone boundaries and types', () => {
    const meetingZone = {
      id: 'zone-all-hands',
      name: 'All-Hands Agora',
      type: 'meeting' as const,
      color: '#38bdf8',
      description: 'Central collaborative conference zone',
      bounds: {
        minX: -8,
        maxX: -2,
        minZ: -8,
        maxZ: -2,
      },
    };

    const parsed = SpatialZoneSchema.safeParse(meetingZone);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('meeting');
      expect(parsed.data.bounds.minX).toBe(-8);
    }
  });

  it('validates proximity and district chat messages', () => {
    const proximityMsg = {
      id: 'msg-1',
      senderId: 'peer-1',
      senderName: 'Devon Vance',
      senderRole: 'admin' as const,
      channel: 'proximity' as const,
      text: 'Hey team, reviewing the incident triage logs now.',
      timestamp: Date.now(),
      position: { x: 1, y: 0, z: 2 },
    };

    const parsed = SpatialChatMessageSchema.safeParse(proximityMsg);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.channel).toBe('proximity');
      expect(parsed.data.position?.x).toBe(1);
    }
  });

  it('validates spatial emote reactions', () => {
    const emote = {
      id: 'emote-1',
      peerId: 'peer-2',
      peerName: 'Maya Lin',
      emote: 'fire' as const,
      timestamp: Date.now(),
    };

    const parsed = SpatialEmoteSchema.safeParse(emote);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.emote).toBe('fire');
    }
  });
});
