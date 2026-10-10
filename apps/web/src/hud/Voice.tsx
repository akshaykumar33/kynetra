import type { Track } from 'livekit-client';
import { useEffect, useRef } from 'react';
import { useOffice } from '../state';
import {
  chooseMicrophone,
  holdToTalk,
  joinVoice,
  localVideo,
  screenTracks,
  setMuted,
  setPushToTalk,
  toggleCamera,
  toggleScreenShare,
  videoTracks,
} from '../voice';

/** Voice controls. Turning voice on has to come from a click: browsers only allow audio after one. */
export function VoicePanel() {
  const voice = useOffice(s => s.voice);
  const orgId = useOffice(s => s.orgId);
  const insideRoom = useOffice(s => s.insideRoom);

  // hold Space to talk when push-to-talk is on
  useEffect(() => {
    if (!voice.pushToTalk) return;
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement).closest('input,textarea,select,button');
    const down = (e: KeyboardEvent) => e.code === 'Space' && !e.repeat && !typing(e) && holdToTalk(true);
    const up = (e: KeyboardEvent) => e.code === 'Space' && holdToTalk(false);
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    return () => {
      removeEventListener('keydown', down);
      removeEventListener('keyup', up);
      holdToTalk(false);
    };
  }, [voice.pushToTalk]);

  if (voice.state === 'off' || voice.state === 'joining')
    return (
      <div className="panel voice">
        <button className="btn" disabled={voice.state === 'joining'} onClick={() => joinVoice(orgId)}>
          {voice.state === 'joining' ? 'Turning on voice…' : 'Turn on voice'}
        </button>
        <small>
          {voice.error ?? 'You’ll hear people when you walk up to them. Your mic is only live while someone is near.'}
        </small>
      </div>
    );

  return (
    <div className="panel voice" aria-label="Voice">
      <div className="row">
        <button className="btn ghost" aria-pressed={voice.muted} onClick={() => setMuted(!voice.muted)}>
          {voice.muted ? 'Unmute' : 'Mute'}
        </button>
        <button className="btn ghost" aria-pressed={voice.camera} onClick={toggleCamera}>
          {voice.camera ? 'Camera off' : 'Camera on'}
        </button>
        <button
          className="btn ghost"
          aria-pressed={voice.sharing}
          disabled={!insideRoom && !voice.sharing}
          title={insideRoom ? undefined : 'Screen sharing works inside a meeting room'}
          onClick={toggleScreenShare}
        >
          {voice.sharing ? 'Stop sharing' : 'Share screen'}
        </button>
      </div>
      <div className="row">
        <label className="check">
          <input type="checkbox" checked={voice.pushToTalk} onChange={e => setPushToTalk(e.target.checked)} />
          Push to talk (hold Space)
        </label>
        {voice.devices.length > 1 && (
          <select
            id="mic-device"
            aria-label="Microphone"
            value={voice.deviceId ?? voice.devices[0].id}
            onChange={e => chooseMicrophone(e.target.value)}
          >
            {voice.devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {voice.state === 'reconnecting' && <small role="status">Voice connection dropped. Reconnecting…</small>}
      {voice.error && (
        <small className="error" role="alert">
          {voice.error}
        </small>
      )}
    </div>
  );
}

function TrackVideo({ track, className, label }: { track: Track; className: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return <video ref={ref} className={className} aria-label={label} muted playsInline autoPlay />;
}

/** Camera bubble above an avatar, shown only while you're close enough to be talking. */
export function VideoBubble({ id, name }: { id: string | 'me'; name: string }) {
  useOffice(s => s.voice.tracksVersion); // re-render as tracks come and go
  const cameraOn = useOffice(s => s.voice.camera);
  const track = id === 'me' ? (cameraOn ? localVideo() : undefined) : videoTracks.get(id);
  if (!track) return null;
  return <TrackVideo track={track} className="bubble" label={`${name}'s camera`} />;
}

/** The meeting room screen: whatever someone in the room is sharing. */
export function ScreenPanel() {
  useOffice(s => s.voice.tracksVersion);
  const insideRoom = useOffice(s => s.insideRoom);
  const [entry] = screenTracks.entries();
  const person = useOffice(s => (entry ? s.people.find(p => p.id === entry[0]) : undefined));
  if (!insideRoom || !entry) return null;
  return (
    <figure className="panel screen">
      <TrackVideo track={entry[1]} className="screen-video" label={`${person?.name ?? 'Someone'}'s shared screen`} />
      <figcaption>{person?.name.split(' ')[0] ?? 'Someone'} is sharing their screen</figcaption>
    </figure>
  );
}
