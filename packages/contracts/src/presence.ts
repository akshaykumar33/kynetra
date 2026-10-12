import { z } from 'zod';
import { Coordinates3DSchema } from './world.js';
import { UserRoleSchema } from './user.js';

export const SpatialZoneTypeSchema = z.enum([
  'meeting',
  'silent',
  'lounge',
  'workstation',
]);
export type SpatialZoneType = z.infer<typeof SpatialZoneTypeSchema>;

export const SpatialZoneBoundsSchema = z.object({
  minX: z.number(),
  maxX: z.number(),
  minZ: z.number(),
  maxZ: z.number(),
});
export type SpatialZoneBounds = z.infer<typeof SpatialZoneBoundsSchema>;

export const SpatialZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SpatialZoneTypeSchema,
  color: z.string(),
  description: z.string(),
  bounds: SpatialZoneBoundsSchema,
});
export type SpatialZone = z.infer<typeof SpatialZoneSchema>;

export const SpatialPeerStatusSchema = z.enum([
  'online',
  'busy',
  'in_meeting',
  'away',
  'focus',
]);
export type SpatialPeerStatus = z.infer<typeof SpatialPeerStatusSchema>;

export const SpatialPeerMediaStateSchema = z.object({
  micOn: z.boolean().default(false),
  cameraOn: z.boolean().default(false),
  screenSharing: z.boolean().default(false),
  speaking: z.boolean().default(false),
});
export type SpatialPeerMediaState = z.infer<typeof SpatialPeerMediaStateSchema>;

export const SpatialPeerSchema = z.object({
  peerId: z.string(),
  userId: z.string(),
  name: z.string(),
  role: UserRoleSchema.default('employee'),
  position: Coordinates3DSchema,
  rotation: z.number().default(0),
  zoneId: z.string().nullable().default(null),
  status: SpatialPeerStatusSchema.default('online'),
  mediaState: SpatialPeerMediaStateSchema.default({
    micOn: false,
    cameraOn: false,
    screenSharing: false,
    speaking: false,
  }),
  avatarColor: z.string().default('#0284c7'),
  lastActive: z.number().default(() => Date.now()),
});
export type SpatialPeer = z.infer<typeof SpatialPeerSchema>;

export const SpatialChatChannelSchema = z.enum(['proximity', 'district']);
export type SpatialChatChannel = z.infer<typeof SpatialChatChannelSchema>;

export const SpatialChatMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  senderRole: UserRoleSchema.default('employee'),
  channel: SpatialChatChannelSchema,
  text: z.string().min(1),
  timestamp: z.number().default(() => Date.now()),
  position: Coordinates3DSchema.optional(),
});
export type SpatialChatMessage = z.infer<typeof SpatialChatMessageSchema>;

export const SpatialEmoteTypeSchema = z.enum([
  'wave',
  'heart',
  'bulb',
  'fire',
  'thumbs_up',
  'coffee',
  'party',
]);
export type SpatialEmoteType = z.infer<typeof SpatialEmoteTypeSchema>;

export const SpatialEmoteSchema = z.object({
  id: z.string(),
  peerId: z.string(),
  peerName: z.string(),
  emote: SpatialEmoteTypeSchema,
  timestamp: z.number().default(() => Date.now()),
});
export type SpatialEmote = z.infer<typeof SpatialEmoteSchema>;
