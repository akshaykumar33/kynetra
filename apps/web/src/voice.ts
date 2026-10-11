import { isInsideRoom, VOICE_PREFETCH, voiceTargets, voiceVolume } from '@knovra/shared';
import {
  ConnectionState,
  LocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
} from 'livekit-client';
import { api } from './api';
import { player, positions, useOffice } from './state';

// Proximity voice and video on LiveKit, following docs/spikes/livekit-spatial.md: one room per floor,
// joined once, and subscriptions toggled as people move (about 50 ms) instead of connecting per chat.

const TICK_MS = 150;

let room: Room | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let current = new Set<string>(); // who we are hearing
let fetching = new Set<string>(); // whose audio we receive (hearing + a little beyond, at volume 0)
let pttHeld = false;

/** Camera and screen-share tracks of people we can see, for the video bubbles and room screen. */
export const videoTracks = new Map<string, RemoteTrack>();
export const screenTracks = new Map<string, RemoteTrack>();

const set = (patch: Partial<ReturnType<typeof useOffice.getState>['voice']>) =>
  useOffice.setState(s => ({ voice: { ...s.voice, ...patch } }));

function explain(err: unknown) {
  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError')
    return 'Microphone access is blocked. Allow it in your browser’s site settings, then turn voice on again.';
  if (name === 'NotFoundError') return 'No microphone found. Plug one in, then turn voice on again.';
  if (name === 'NotReadableError') return 'Your microphone is in use by another app. Close it, then try again.';
  return 'Voice could not connect. Check your connection and try again.';
}

/** Applies the proximity rules: who to hear, how loud, and whether our own mic is live. */
function tick() {
  if (!room || room.state !== ConnectionState.Connected) return;
  const st = useOffice.getState();
  const next = voiceTargets(player.pos, st.myStatus, positions, st.statuses, current);
  fetching = voiceTargets(
    player.pos,
    st.myStatus,
    positions,
    st.statuses,
    fetching,
    VOICE_PREFETCH,
    VOICE_PREFETCH + 1,
  );
  for (const id of next) fetching.add(id);
  const meInRoom = isInsideRoom(player.pos.x, player.pos.z);

  for (const p of room.remoteParticipants.values()) {
    const near = next.has(p.identity);
    const prefetch = fetching.has(p.identity);
    for (const pub of p.trackPublications.values()) {
      const want =
        pub.source === Track.Source.ScreenShare
          ? meInRoom && near // screen share is for the meeting room
          : pub.source === Track.Source.Microphone
            ? prefetch
            : near; // cameras only once you're actually talking
      if (pub.isSubscribed !== want) pub.setSubscribed(want);
    }
    const pos = positions.get(p.identity);
    if (prefetch) p.setVolume(near && pos ? voiceVolume(Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z)) : 0);
  }

  // only send audio while someone can hear it; alone at your desk your mic is muted
  const v = st.voice;
  const live = next.size > 0 && !v.muted && (!v.pushToTalk || pttHeld);
  const mic = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack | undefined;
  if (mic && mic.isMuted === live) void (live ? mic.unmute() : mic.mute());

  if (next.size !== current.size || [...next].some(id => !current.has(id))) {
    current = next;
    set({ hearing: [...next].sort() });
  }
}

export async function joinVoice(orgId: string) {
  if (room) return;
  set({ state: 'joining', error: null });
  const r = new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  room = r;
  r.on(RoomEvent.ActiveSpeakersChanged, speakers => set({ speaking: speakers.map(s => s.identity).sort() }));
  r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, p: RemoteParticipant) => {
    if (track.kind === Track.Kind.Audio) track.attach(); // plays through a hidden <audio> element
    if (track.source === Track.Source.Camera) videoTracks.set(p.identity, track);
    if (track.source === Track.Source.ScreenShare) screenTracks.set(p.identity, track);
    set({ tracksVersion: useOffice.getState().voice.tracksVersion + 1 });
  });
  r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, p: RemoteParticipant) => {
    track.detach();
    if (track.source === Track.Source.Camera) videoTracks.delete(p.identity);
    if (track.source === Track.Source.ScreenShare) screenTracks.delete(p.identity);
    set({ tracksVersion: useOffice.getState().voice.tracksVersion + 1 });
  });
  r.on(RoomEvent.Reconnecting, () => set({ state: 'reconnecting' }));
  r.on(RoomEvent.Reconnected, () => set({ state: 'on' }));
  r.on(RoomEvent.Disconnected, () => {
    if (room !== r) return;
    cleanup();
    set({ state: 'off', error: 'Voice disconnected. Turn it on again to rejoin.' });
  });
  r.on(RoomEvent.LocalTrackPublished, () =>
    set({ camera: r.localParticipant.isCameraEnabled, sharing: r.localParticipant.isScreenShareEnabled }),
  );
  r.on(RoomEvent.LocalTrackUnpublished, () =>
    set({ camera: r.localParticipant.isCameraEnabled, sharing: r.localParticipant.isScreenShareEnabled }),
  );

  try {
    const { url, token } = await api.voiceToken(orgId);
    await r.connect(url, token, { autoSubscribe: false });
    await r.startAudio(); // this runs from the "Turn on voice" click, so playback is allowed
    await r.localParticipant.setMicrophoneEnabled(true);
    // start muted; tick() unmutes only when someone is in range
    const mic = r.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack | undefined;
    await mic?.mute();
    const devices = await Room.getLocalDevices('audioinput');
    set({ state: 'on', devices: devices.map(d => ({ id: d.deviceId, label: d.label || 'Microphone' })) });
    timer = setInterval(tick, TICK_MS);
    tick();
  } catch (err) {
    const message = explain(err);
    await leaveVoice();
    set({ state: 'off', error: message });
  }
}

function cleanup() {
  if (timer) clearInterval(timer);
  timer = null;
  room = null;
  current = new Set();
  fetching = new Set();
  videoTracks.clear();
  screenTracks.clear();
  set({ hearing: [], speaking: [], camera: false, sharing: false });
}

export async function leaveVoice() {
  const r = room;
  cleanup();
  await r?.disconnect();
  set({ state: 'off' });
}

export function setMuted(muted: boolean) {
  set({ muted });
  tick();
}

export function setPushToTalk(pushToTalk: boolean) {
  set({ pushToTalk });
  tick();
}

export function holdToTalk(held: boolean) {
  pttHeld = held;
  tick();
}

export async function toggleCamera() {
  if (!room) return;
  try {
    await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
  } catch (err) {
    set({
      error:
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera access is blocked in your browser’s site settings.'
          : 'Could not start your camera.',
    });
  }
}

export async function toggleScreenShare() {
  if (!room) return;
  try {
    await room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled);
  } catch {
    // the person cancelled the browser's picker; nothing to report
  }
}

export async function chooseMicrophone(deviceId: string) {
  await room?.switchActiveDevice('audioinput', deviceId);
  set({ deviceId });
}

/** Ids we can actually hear: their audio is arriving from LiveKit and they're in hearing range. */
export function audibleIds() {
  if (!room) return [];
  return [...room.remoteParticipants.values()]
    .filter(p => p.getTrackPublication(Track.Source.Microphone)?.isSubscribed && current.has(p.identity))
    .map(p => p.identity)
    .sort();
}

/** Local camera track, for showing yourself in your own bubble. */
export const localVideo = () => room?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;

if (import.meta.env.DEV) {
  // e2e tests check real LiveKit subscriptions. This module loads after state.ts has created the hook,
  // and it stays out of state.ts so LiveKit is only downloaded with the 3D office.
  Object.assign((window as unknown as { __office: object }).__office, { audibleIds });
}
