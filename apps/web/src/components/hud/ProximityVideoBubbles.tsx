'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SpatialPeer } from '@kynetra/contracts';

interface ProximityVideoBubblesProps {
  proximityPeers: SpatialPeer[];
  localStream: MediaStream | null;
  localName: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isSpeaking: boolean;
  getPeerStream: (peerId: string) => MediaStream | undefined;
}

export function ProximityVideoBubbles({
  proximityPeers,
  localStream,
  localName,
  isCameraOn,
  isMicOn,
  isSpeaking,
  getPeerStream,
}: ProximityVideoBubblesProps) {
  const [expandedScreenPeer, setExpandedScreenPeer] = useState<SpatialPeer | null>(null);

  if (proximityPeers.length === 0 && !isCameraOn) {
    return null;
  }

  return (
    <>
      {/* Floating Video Bubbles Container */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          zIndex: 35,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          pointerEvents: 'auto',
        }}
      >
        {/* Local Player Self-View Preview (if camera is active) */}
        {isCameraOn && (
          <VideoCard
            title={`${localName} (You)`}
            role="employee"
            stream={localStream}
            isMicOn={isMicOn}
            isSpeaking={isSpeaking}
            isSelf
            avatarColor="#0284c7"
          />
        )}

        {/* Remote Proximity / Meeting Peers */}
        {proximityPeers.map((peer) => {
          const stream = getPeerStream(peer.peerId);
          return (
            <VideoCard
              key={peer.peerId}
              title={peer.name}
              role={peer.role}
              stream={stream}
              isMicOn={peer.mediaState.micOn}
              isSpeaking={peer.mediaState.speaking}
              avatarColor={peer.avatarColor}
              isScreenSharing={peer.mediaState.screenSharing}
              zoneId={peer.zoneId}
              onExpandScreen={() => setExpandedScreenPeer(peer)}
            />
          );
        })}
      </div>

      {/* Screen Share Modal (When clicking expand on a sharing coworker) */}
      {expandedScreenPeer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setExpandedScreenPeer(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '90vw',
              maxWidth: '1200px',
              height: '75vh',
              background: '#0f172a',
              borderRadius: '16px',
              border: '2px solid #f59e0b',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                background: 'rgba(30, 41, 59, 0.95)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#fbbf24' }}>🖥️</span>
                <span style={{ fontWeight: 700 }}>{expandedScreenPeer.name}&apos;s Screen Stream</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                  }}
                >
                  LIVE HD
                </span>
              </div>
              <button
                onClick={() => setExpandedScreenPeer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', height: 'calc(100% - 50px)', background: '#020617' }}>
              <VideoPlayer stream={getPeerStream(expandedScreenPeer.peerId)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface VideoCardProps {
  title: string;
  role: string;
  stream?: MediaStream | null;
  isMicOn: boolean;
  isSpeaking: boolean;
  avatarColor: string;
  isSelf?: boolean;
  isScreenSharing?: boolean;
  zoneId?: string | null;
  onExpandScreen?: () => void;
}

function VideoCard({
  title,
  role,
  stream,
  isMicOn,
  isSpeaking,
  avatarColor,
  isSelf = false,
  isScreenSharing = false,
  zoneId,
  onExpandScreen,
}: VideoCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '200px',
        height: '145px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#0f172a',
        border: isSpeaking
          ? '2px solid #22c55e'
          : isSelf
          ? '1.5px solid #38bdf8'
          : '1px solid rgba(245, 158, 11, 0.4)',
        boxShadow: isSpeaking
          ? '0 0 20px rgba(34, 197, 94, 0.5)'
          : '0 8px 24px rgba(0, 0, 0, 0.55)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Video Content */}
      <VideoPlayer stream={stream} fallbackColor={avatarColor} title={title} />

      {/* Top Badges */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          right: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: role === 'admin' ? '#f87171' : role === 'architect' ? '#fbbf24' : '#60a5fa',
          }}
        >
          {role}
        </span>

        <span
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: isMicOn ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: '#fff',
          }}
        >
          {isMicOn ? '🎙️' : '🔇'}
        </span>
      </div>

      {/* Bottom Info Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '6px 10px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.95) 80%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '120px',
            }}
          >
            {title}
          </span>
          {isSpeaking && (
            <span
              style={{
                fontSize: '9px',
                color: '#4ade80',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            >
              SPEAKING
            </span>
          )}
        </div>

        {zoneId && (
          <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            {zoneId.replace('zone-', '').toUpperCase()}
          </span>
        )}
      </div>

      {/* Screen Share Overlay Trigger */}
      {isScreenSharing && onExpandScreen && (
        <button
          onClick={onExpandScreen}
          style={{
            position: 'absolute',
            top: '38px',
            right: '8px',
            background: 'rgba(245, 158, 11, 0.9)',
            border: 'none',
            color: '#fff',
            borderRadius: '6px',
            padding: '3px 6px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          🖥️ Screen
        </button>
      )}
    </div>
  );
}

function VideoPlayer({
  stream,
  fallbackColor = '#0284c7',
  title = '',
}: {
  stream?: MediaStream | null;
  fallbackColor?: string;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (stream && stream.getVideoTracks().length > 0) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  // Fallback Monogram Avatar
  const initials = title
    ? title
        .split(' ')
        .map((t) => t[0])
        .join('')
        .slice(0, 2)
    : '👤';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle, ${fallbackColor}33 0%, #0f172a 80%)`,
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: fallbackColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '18px',
          fontFamily: 'var(--font-mono)',
          boxShadow: `0 0 16px ${fallbackColor}66`,
        }}
      >
        {initials}
      </div>
    </div>
  );
}
