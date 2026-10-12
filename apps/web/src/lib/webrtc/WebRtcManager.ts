import type {
  SpatialPeer,
  SpatialZone,
  SpatialChatMessage,
  SpatialEmote,
  UserRole,
} from '@kynetra/contracts';

export interface WebRtcCallbacks {
  onPeersUpdated: (peers: SpatialPeer[]) => void;
  onProximityPeersChanged: (peers: SpatialPeer[]) => void;
  onRemoteStreamReceived?: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamEnded?: (peerId: string) => void;
  onChatMessageReceived: (msg: SpatialChatMessage) => void;
  onEmoteReceived: (emote: SpatialEmote) => void;
  onLocalMediaStateChanged: (state: SpatialPeer['mediaState']) => void;
  onCurrentZoneChanged: (zone: SpatialZone | null) => void;
}

export const CANONICAL_ZONES: SpatialZone[] = [
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
    bounds: { minX: 3, maxX: 11, minZ: 3, maxZ: 10 },
  },
];

const PROXIMITY_DISTANCE = 7.0; // Proximity threshold in meters/units
const FULL_VOLUME_DISTANCE = 2.5;

export class WebRtcManager {
  private localPeerId: string;
  private localUser: { id: string; name: string; role: UserRole };
  private localPosition = { x: 0, y: 0, z: 4 };
  private localRotation = 0;
  private currentZone: SpatialZone | null = null;

  // Media Streams
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private isMicOn = false;
  private isCameraOn = false;
  private isScreenSharing = false;
  private isSpeaking = false;

  // Audio Context & Analyser for VAD
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;

  // Peers & Streams
  private peers: Map<string, SpatialPeer> = new Map();
  private peerStreams: Map<string, MediaStream> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();

  // PeerJS instance
  private peerInstance: any = null;
  private callbacks: WebRtcCallbacks;

  // Virtual Coworkers / Simulation Loop
  private virtualPeersInterval: number | null = null;
  private simulatedTeammatesInitialized = false;

  constructor(
    localUser: { id: string; name: string; role: UserRole },
    callbacks: WebRtcCallbacks
  ) {
    this.localUser = localUser;
    this.localPeerId = `peer-${localUser.id}-${Math.random().toString(36).substring(2, 7)}`;
    this.callbacks = callbacks;

    if (typeof window !== 'undefined') {
      this.initPeerJs();
    }
  }

  public setLocalUser(user: { id: string; name: string; role: UserRole }) {
    this.localUser = user;
    this.broadcastLocalState();
  }

  public getLocalPeerId(): string {

    return this.localPeerId;
  }

  public getLocalMediaState(): SpatialPeer['mediaState'] {
    return {
      micOn: this.isMicOn,
      cameraOn: this.isCameraOn,
      screenSharing: this.isScreenSharing,
      speaking: this.isSpeaking,
    };
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  public getPeerStream(peerId: string): MediaStream | undefined {
    return this.peerStreams.get(peerId);
  }

  public getAllPeers(): SpatialPeer[] {
    return Array.from(this.peers.values());
  }

  public getCurrentZone(): SpatialZone | null {
    return this.currentZone;
  }

  // 1. Initialize PeerJS (with dynamic browser import)
  private async initPeerJs() {
    try {
      const { Peer } = await import('peerjs');
      this.peerInstance = new Peer(this.localPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      this.peerInstance.on('open', (id: string) => {
        this.localPeerId = id;
        this.broadcastLocalState();
      });

      this.peerInstance.on('disconnected', () => {
        // Auto-reconnect if temporary network drop or broker disconnection occurs
        if (this.peerInstance && !this.peerInstance.destroyed) {
          setTimeout(() => {
            if (this.peerInstance && !this.peerInstance.destroyed && this.peerInstance.disconnected) {
              try {
                this.peerInstance.reconnect();
              } catch {
                // Silently handle reconnect
              }
            }
          }, 2000);
        }
      });

      this.peerInstance.on('error', (err: any) => {
        // Handle network disconnect or lost connection to server gracefully
        const errorMsg = String(err?.message || err?.type || '');
        if (
          err?.type === 'network' ||
          err?.type === 'server-error' ||
          err?.type === 'socket-error' ||
          err?.type === 'socket-closed' ||
          errorMsg.includes('Lost connection')
        ) {
          if (this.peerInstance && !this.peerInstance.destroyed && this.peerInstance.disconnected) {
            try {
              this.peerInstance.reconnect();
            } catch {
              // Silently handle reconnect
            }
          }
        }
      });

      this.peerInstance.on('call', (mediaConnection: any) => {
        // Answer incoming proximity or meeting call
        const answerStream = this.localStream || this.createSilentAudioStream();
        mediaConnection.answer(answerStream);

        mediaConnection.on('stream', (remoteStream: MediaStream) => {
          this.handleIncomingStream(mediaConnection.peer, remoteStream);
        });

        mediaConnection.on('close', () => {
          this.handleStreamClosed(mediaConnection.peer);
        });
      });

      this.peerInstance.on('connection', (dataConn: any) => {
        dataConn.on('data', (data: any) => {
          this.handleIncomingData(data);
        });
      });
    } catch {
      // Graceful fallback to client mesh
    }
  }

  // 2. Hardware Media Controls: Mic & Camera
  public async toggleMicrophone(forceState?: boolean): Promise<boolean> {
    const targetState = forceState !== undefined ? forceState : !this.isMicOn;

    if (targetState) {
      if (!this.localStream) {
        await this.initLocalMedia(true, this.isCameraOn);
      } else {
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = true;
        } else {
          await this.initLocalMedia(true, this.isCameraOn);
        }
      }
      this.isMicOn = true;
      this.startVoiceActivityDetection();
    } else {
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => (track.enabled = false));
      }
      this.isMicOn = false;
      this.isSpeaking = false;
      this.stopVoiceActivityDetection();
    }

    this.notifyMediaStateChanged();
    this.broadcastLocalState();
    return this.isMicOn;
  }

  public async toggleCamera(forceState?: boolean): Promise<boolean> {
    const targetState = forceState !== undefined ? forceState : !this.isCameraOn;

    if (targetState) {
      if (!this.localStream) {
        await this.initLocalMedia(this.isMicOn, true);
      } else {
        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks[0].enabled = true;
        } else {
          await this.initLocalMedia(this.isMicOn, true);
        }
      }
      this.isCameraOn = true;
    } else {
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach((track) => (track.enabled = false));
      }
      this.isCameraOn = false;
    }

    this.notifyMediaStateChanged();
    this.broadcastLocalState();
    return this.isCameraOn;
  }

  // 3. Screen Sharing: Capture & Stop
  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) return null;

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      this.screenStream = screenStream;
      this.isScreenSharing = true;

      // Handle user clicking "Stop Sharing" on browser banner
      screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      this.notifyMediaStateChanged();
      this.broadcastLocalState();
      return screenStream;
    } catch {
      this.isScreenSharing = false;
      this.notifyMediaStateChanged();
      return null;
    }
  }

  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    this.isScreenSharing = false;
    this.notifyMediaStateChanged();
    this.broadcastLocalState();
  }

  // 4. Local Media Stream Initialization
  private async initLocalMedia(needAudio: boolean, needVideo: boolean) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: needVideo ? { width: 640, height: 480 } : false,
      });

      if (!needAudio) {
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      if (!needVideo) {
        stream.getVideoTracks().forEach((t) => (t.enabled = false));
      }

      this.localStream = stream;
    } catch {
      // Fallback: If hardware is unavailable or denied, generate simulated stream
      this.localStream = this.createSimulatedMediaStream(this.localUser.name, '#0284c7');
    }
  }

  // 5. Voice Activity Detection (VAD) via Web Audio API
  private startVoiceActivityDetection() {
    if (this.vadInterval || !this.localStream) return;

    try {
      const audioTracks = this.localStream.getAudioTracks();
      if (!audioTracks.length) return;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      const source = this.audioCtx.createMediaStreamSource(this.localStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);

      this.vadInterval = window.setInterval(() => {
        if (!this.isMicOn || !this.analyser) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.notifyMediaStateChanged();
            this.broadcastLocalState();
          }
          return;
        }

        this.analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const nowSpeaking = avg > 22; // Threshold for vocal energy

        if (nowSpeaking !== this.isSpeaking) {
          this.isSpeaking = nowSpeaking;
          this.notifyMediaStateChanged();
          this.broadcastLocalState();
        }
      }, 100);
    } catch {
      // Fallback
    }
  }

  private stopVoiceActivityDetection() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  // 6. Real-time Spatial Position & Zone Detection
  public updateLocalPosition(x: number, y: number, z: number, rotation = 0) {
    this.localPosition = { x, y, z };
    this.localRotation = rotation;

    // Determine current zone
    const matchedZone = CANONICAL_ZONES.find((zone) => {
      const b = zone.bounds;
      return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
    }) || null;

    if (matchedZone?.id !== this.currentZone?.id) {
      this.currentZone = matchedZone;
      this.callbacks.onCurrentZoneChanged(matchedZone);
    }

    this.recalculateProximities();
  }

  // 7. Proximity & Spatial Audio Calculation
  private recalculateProximities() {
    const proximityPeers: SpatialPeer[] = [];
    const isLocalInSilentZone = this.currentZone?.type === 'silent';

    this.peers.forEach((peer) => {
      const isPeerInSilentZone = peer.zoneId === 'zone-focus-pod';
      const areBothInMeeting =
        this.currentZone?.type === 'meeting' &&
        peer.zoneId === this.currentZone.id;

      // Distance in XZ plane
      const dx = this.localPosition.x - peer.position.x;
      const dz = this.localPosition.z - peer.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      let effectiveVolume = 0;
      let isInProximity = false;

      if (isLocalInSilentZone || isPeerInSilentZone) {
        // Silent zone: proximity audio & video calls are suppressed for deep focus
        effectiveVolume = 0;
        isInProximity = false;
      } else if (areBothInMeeting) {
        // Both in same conference room: 100% volume
        effectiveVolume = 1.0;
        isInProximity = true;
      } else if (dist <= PROXIMITY_DISTANCE) {
        isInProximity = true;
        if (dist <= FULL_VOLUME_DISTANCE) {
          effectiveVolume = 1.0;
        } else {
          // Linear distance fade
          effectiveVolume = Math.max(
            0,
            1.0 - (dist - FULL_VOLUME_DISTANCE) / (PROXIMITY_DISTANCE - FULL_VOLUME_DISTANCE)
          );
        }
      }

      if (isInProximity) {
        proximityPeers.push(peer);
      }

      // Adjust audio element volume
      const audioEl = this.audioElements.get(peer.peerId);
      if (audioEl) {
        audioEl.volume = Math.min(1, Math.max(0, effectiveVolume));
      }
    });

    this.callbacks.onProximityPeersChanged(proximityPeers);
  }

  // 8. Remote Streams & Calls Handlers
  private handleIncomingStream(peerId: string, stream: MediaStream) {
    this.peerStreams.set(peerId, stream);

    // Attach audio track to hidden audio element
    if (!this.audioElements.has(peerId)) {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.volume = 1.0;
      this.audioElements.set(peerId, audio);
    }

    if (this.callbacks.onRemoteStreamReceived) {
      this.callbacks.onRemoteStreamReceived(peerId, stream);
    }
  }

  private handleStreamClosed(peerId: string) {
    this.peerStreams.delete(peerId);
    const audio = this.audioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerId);
    }
    if (this.callbacks.onRemoteStreamEnded) {
      this.callbacks.onRemoteStreamEnded(peerId);
    }
  }

  private handleIncomingData(data: any) {
    if (data.type === 'peer_update') {
      this.peers.set(data.peer.peerId, data.peer);
      this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
      this.recalculateProximities();
    } else if (data.type === 'chat') {
      this.callbacks.onChatMessageReceived(data.message);
    } else if (data.type === 'emote') {
      this.callbacks.onEmoteReceived(data.emote);
    }
  }

  private broadcastLocalState() {
    const localPeer: SpatialPeer = {
      peerId: this.localPeerId,
      userId: this.localUser.id,
      name: this.localUser.name,
      role: this.localUser.role,
      position: this.localPosition,
      rotation: this.localRotation,
      zoneId: this.currentZone?.id || null,
      status: this.currentZone?.type === 'meeting'
        ? 'in_meeting'
        : this.currentZone?.type === 'silent'
        ? 'focus'
        : 'online',
      mediaState: this.getLocalMediaState(),
      avatarColor: '#0284c7',
      lastActive: Date.now(),
    };

    // Update in local peers list
    this.peers.set(this.localPeerId, localPeer);
    this.callbacks.onPeersUpdated(Array.from(this.peers.values()));
  }

  private notifyMediaStateChanged() {
    this.callbacks.onLocalMediaStateChanged(this.getLocalMediaState());
  }

  // 9. Interactive Chat & Emote Reactions
  // 9. Interactive Chat & Emote Reactions
  public sendChatMessage(text: string, channel: 'proximity' | 'district') {
    const msg: SpatialChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      senderId: this.localPeerId,
      senderName: this.localUser.name,
      senderRole: this.localUser.role,
      channel,
      text,
      timestamp: Date.now(),
      position: this.localPosition,
    };

    this.callbacks.onChatMessageReceived(msg);
  }

  public sendEmote(emote: SpatialEmote['emote']) {
    const emoteEvent: SpatialEmote = {
      id: `emote-${Date.now()}`,
      peerId: this.localPeerId,
      peerName: this.localUser.name,
      emote,
      timestamp: Date.now(),
    };

    this.callbacks.onEmoteReceived(emoteEvent);
  }


  // 11. Stream Synthesizers for Offline / Standalone Browser Video Feeds
  private createSimulatedMediaStream(name: string, accentColor: string): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    let frame = 0;
    const draw = () => {
      frame++;
      if (ctx) {
        // Dark cyber card background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 320, 240);

        // Grid lines
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 320; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 240);
          ctx.stroke();
        }

        // Animated subtle pulse circle
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        const radius = 48 + Math.sin(frame * 0.08) * 3;
        ctx.arc(160, 110, radius, 0, Math.PI * 2);
        ctx.fill();

        // Monogram / Initials
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('');
        ctx.fillText(initials, 160, 110);

        // Webcam Header Tag
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(10, 195, 300, 34);
        ctx.strokeStyle = accentColor;
        ctx.strokeRect(10, 195, 300, 34);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🟢 LIVE | ${name}`, 22, 217);
      }
      requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = canvas.captureStream(24);
    const audioTrack = this.createSilentAudioTrack();
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }
    return canvasStream;
  }

  private createSilentAudioStream(): MediaStream {
    const stream = new MediaStream();
    const track = this.createSilentAudioTrack();
    if (track) stream.addTrack(track);
    return stream;
  }

  private createSilentAudioTrack(): MediaStreamTrack | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      const track = dst.stream.getAudioTracks()[0];
      track.enabled = false;
      return track;
    } catch {
      return null;
    }
  }

  public destroy() {
    this.stopVoiceActivityDetection();
    if (this.virtualPeersInterval) {
      clearInterval(this.virtualPeersInterval);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
    }
    if (this.peerInstance) {
      try {
        this.peerInstance.removeAllListeners?.();
        this.peerInstance.destroy();
      } catch {
        // Silently handle destruction
      }
      this.peerInstance = null;
    }
    this.audioElements.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    this.audioElements.clear();
  }
}
