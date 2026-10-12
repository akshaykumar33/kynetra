'use client';

import React from 'react';
import type { SpatialPeer } from '@kynetra/contracts';

interface CoworkerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  peers: SpatialPeer[];
  localPeerId: string;
  onTeleportToPeer: (peer: SpatialPeer) => void;
}

export function CoworkerDirectoryModal({
  isOpen,
  onClose,
  peers,
  localPeerId,
  onTeleportToPeer,
}: CoworkerDirectoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '80vh',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(30, 41, 59, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👥</span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: '15px',
                color: '#f8fafc',
              }}
            >
              Coworkers Directory ({peers.length} Online)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Coworkers List */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {peers.map((peer) => {
            const isMe = peer.peerId === localPeerId;
            return (
              <div
                key={peer.peerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: isMe ? 'rgba(2, 132, 199, 0.12)' : 'rgba(30, 41, 59, 0.6)',
                  border: isMe ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Monogram Badge */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: peer.avatarColor || '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '14px',
                      boxShadow: `0 0 12px ${peer.avatarColor || '#0284c7'}55`,
                    }}
                  >
                    {peer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: '#f8fafc',
                        }}
                      >
                        {peer.name} {isMe && '(You)'}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: peer.role === 'admin' ? '#f87171' : peer.role === 'architect' ? '#fbbf24' : '#60a5fa',
                          textTransform: 'uppercase',
                        }}
                      >
                        {peer.role}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: '#94a3b8',
                        fontFamily: 'var(--font-mono)',
                        marginTop: '2px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor:
                            peer.status === 'in_meeting'
                              ? '#38bdf8'
                              : peer.status === 'focus'
                              ? '#a78bfa'
                              : '#22c55e',
                        }}
                      />
                      <span>
                        {peer.zoneId
                          ? peer.zoneId.replace('zone-', '').replace('-', ' ').toUpperCase()
                          : 'Open Office'}
                      </span>
                      <span>•</span>
                      <span>{peer.mediaState.micOn ? '🎙️ Mic On' : '🔇 Muted'}</span>
                    </div>
                  </div>
                </div>

                {!isMe && (
                  <button
                    onClick={() => {
                      onTeleportToPeer(peer);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fbbf24',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.35)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)')}
                  >
                    <span>⚡</span>
                    <span>Teleport</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
