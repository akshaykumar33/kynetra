import type { FastifyInstance } from 'fastify';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { z } from 'zod';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { requireMember } from '../http/access';

const TOKEN_TTL = '2h';

/** The LiveKit room for an org's floor. One room per floor, joined on arrival (see docs/spikes). */
export const voiceRoomFor = (orgId: string) => `floor-${orgId}`;

export function registerVoiceRoutes(app: FastifyInstance, db: Db, config: Config) {
  // POST so the CSRF guard applies: a token lets the bearer speak on the floor.
  app.post('/api/v1/orgs/:orgId/voice-token', async req => {
    const { orgId } = z.object({ orgId: z.string().uuid() }).parse(req.params);
    const { user } = await requireMember(db, req, orgId);
    const room = voiceRoomFor(orgId);
    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: user.id, // matches presence ids, so voice and avatars line up
      name: user.name,
      ttl: TOKEN_TTL,
    });
    at.addGrant({
      room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE],
      canPublishData: false,
      canUpdateOwnMetadata: false,
    });
    return { url: config.livekit.url, room, token: await at.toJwt() };
  });
}
