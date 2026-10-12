'use client';

import React, { useState } from 'react';
import type { SpatialPeer, SpatialZone, SpatialEmoteType } from '@kynetra/contracts';

interface WorkAdventureActionBarProps {
  localMediaState: SpatialPeer['mediaState'];
  currentZone: SpatialZone | null;
  onlineCount: number;
  unreadChatCount: number;
  isChatOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onSendEmote: (emote: SpatialEmoteType) => void;
  onToggleChat: () => void;
  onOpenDirectory: () => void;
}

const EMOTE_LIST: { type: SpatialEmoteType; emoji: string; label: string }[] = [
  { type: 'wave', emoji: '👋', label: 'Wave' },
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'bulb', emoji: '💡', label: 'Idea' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'thumbs_up', emoji: '👍', label: 'Great' },
  { type: 'coffee', emoji: '☕', label: 'Coffee' },
  { type: 'party', emoji: '🎉', label: 'Party' },
];

export function WorkAdventureActionBar({
  localMediaState,
  currentZone,
  onlineCount,
  unreadChatCount,
  isChatOpen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSendEmote,
  onToggleChat,
  onOpenDirectory,
}: WorkAdventureActionBarProps) {
  const [showEmotePicker, setShowEmotePicker] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        borderRadius: '20px',
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(245, 158, 11, 0.45)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(245, 158, 11, 0.15)',
      }}
    >
      {/* Current Zone Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '12px',
          background: currentZone
            ? currentZone.type === 'meeting'
              ? 'rgba(2, 132, 199, 0.25)'
              : currentZone.type === 'silent'
              ? 'rgba(139, 92, 246, 0.25)'
              : 'rgba(245, 158, 11, 0.2)'
            : 'rgba(30, 41, 59, 0.6)',
          border: `1px solid ${
            currentZone
              ? currentZone.type === 'meeting'
                ? '#38bdf8'
                : currentZone.type === 'silent'
                ? '#a78bfa'
                : '#fbbf24'
              : 'rgba(203, 213, 225, 0.2)'
          }`,
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: currentZone ? '#f8fafc' : '#94a3b8',
          whiteSpace: 'nowrap',
        }}
      >
        <span>
          {currentZone?.type === 'meeting'
            ? '🏛️'
            : currentZone?.type === 'silent'
            ? '🤫'
            : currentZone?.type === 'lounge'
            ? '☕'
            : currentZone?.type === 'workstation'
            ? '💻'
            : '🚶'}
        </span>
        <span>{currentZone ? currentZone.name : 'Open Office Floor'}</span>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)' }} />

      {/* Mic Button */}
      <button
        onClick={onToggleMic}
        title={localMediaState.micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: localMediaState.speaking
            ? '2px solid #22c55e'
            : localMediaState.micOn
            ? '1px solid #38bdf8'
            : '1px solid rgba(239, 68, 68, 0.5)',
          background: localMediaState.speaking
            ? 'rgba(34, 197, 94, 0.25)'
            : localMediaState.micOn
            ? 'rgba(2, 132, 199, 0.25)'
            : 'rgba(239, 68, 68, 0.2)',
          color: localMediaState.micOn ? '#f8fafc' : '#f87171',
          fontSize: '17px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: localMediaState.speaking ? '0 0 16px rgba(34, 197, 94, 0.6)' : 'none',
        }}
      >
        {localMediaState.micOn ? '🎙️' : '🔇'}
      </button>

      {/* Camera Button */}
      <button
        onClick={onToggleCamera}
        title={localMediaState.cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: localMediaState.cameraOn ? '1px solid #38bdf8' : '1px solid rgba(239, 68, 68, 0.5)',
          background: localMediaState.cameraOn ? 'rgba(2, 132, 199, 0.25)' : 'rgba(239, 68, 68, 0.2)',
          color: localMediaState.cameraOn ? '#f8fafc' : '#f87171',
          fontSize: '17px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {localMediaState.cameraOn ? '📹' : '🚫'}
      </button>

      {/* Screen Share Button */}
      <button
        onClick={onToggleScreenShare}
        title={localMediaState.screenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: localMediaState.screenSharing ? '2px solid #f59e0b' : '1px solid rgba(203, 213, 225, 0.2)',
          background: localMediaState.screenSharing ? 'rgba(245, 158, 11, 0.3)' : 'rgba(30, 41, 59, 0.7)',
          color: localMediaState.screenSharing ? '#fbbf24' : '#cbd5e1',
          fontSize: '17px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: localMediaState.screenSharing ? '0 0 15px rgba(245, 158, 11, 0.5)' : 'none',
        }}
      >
        🖥️
      </button>

      {/* Emote Reaction Wheel Popover */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowEmotePicker((prev) => !prev)}
          title="Reactions & Emotes"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: showEmotePicker ? '2px solid #f59e0b' : '1px solid rgba(203, 213, 225, 0.2)',
            background: showEmotePicker ? 'rgba(245, 158, 11, 0.25)' : 'rgba(30, 41, 59, 0.7)',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          😀
        </button>

        {showEmotePicker && (
          <div
            style={{
              position: 'absolute',
              bottom: '52px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          >
            {EMOTE_LIST.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  onSendEmote(item.type);
                  setShowEmotePicker(false);
                }}
                title={item.label}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)' }} />

      {/* Chat Drawer Toggle */}
      <button
        onClick={onToggleChat}
        title="Spatial & District Chat"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '12px',
          border: isChatOpen ? '1px solid #38bdf8' : '1px solid rgba(203, 213, 225, 0.2)',
          background: isChatOpen ? 'rgba(2, 132, 199, 0.3)' : 'rgba(30, 41, 59, 0.7)',
          color: '#f8fafc',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <span>💬</span>
        <span>Chat</span>
        {unreadChatCount > 0 && !isChatOpen && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
            }}
          >
            {unreadChatCount}
          </span>
        )}
      </button>

      {/* Coworkers Directory Toggle */}
      <button
        onClick={onOpenDirectory}
        title="View Coworkers Directory"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          background: 'rgba(30, 41, 59, 0.7)',
          color: '#fbbf24',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <span>👥</span>
        <span>{onlineCount} Coworkers</span>
      </button>
    </div>
  );
}
