'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { SpatialChatMessage, SpatialChatChannel } from '@kynetra/contracts';

interface SpatialChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: SpatialChatMessage[];
  onSendMessage: (text: string, channel: SpatialChatChannel) => void;
  localPeerId: string;
}

export function SpatialChatDrawer({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  localPeerId,
}: SpatialChatDrawerProps) {
  const [activeChannel, setActiveChannel] = useState<SpatialChatChannel>('proximity');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeChannel]);

  if (!isOpen) return null;

  const filteredMessages = messages.filter((m) => m.channel === activeChannel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), activeChannel);
    setInputText('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '72px',
        right: '24px',
        width: '360px',
        height: '520px',
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(245, 158, 11, 0.45)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header & Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(30, 41, 59, 0.6)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveChannel('proximity')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: activeChannel === 'proximity' ? '1px solid #38bdf8' : 'none',
              background: activeChannel === 'proximity' ? 'rgba(2, 132, 199, 0.3)' : 'transparent',
              color: activeChannel === 'proximity' ? '#38bdf8' : '#94a3b8',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>👂</span>
            <span>Proximity</span>
          </button>

          <button
            onClick={() => setActiveChannel('district')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: activeChannel === 'district' ? '1px solid #f59e0b' : 'none',
              background: activeChannel === 'district' ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
              color: activeChannel === 'district' ? '#fbbf24' : '#94a3b8',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>📢</span>
            <span>All-Hands</span>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Info Tag */}
      <div
        style={{
          padding: '6px 14px',
          background: activeChannel === 'proximity' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: activeChannel === 'proximity' ? '#7dd3fc' : '#fde68a',
        }}
      >
        {activeChannel === 'proximity'
          ? '⚡ Earshot mode: Heard only by coworkers within 7 meters.'
          : '🌐 Floor broadcast: Visible to everyone in this district.'}
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {filteredMessages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#64748b',
              fontSize: '12px',
              marginTop: '40px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            No messages yet in {activeChannel} chat. Say hi to nearby coworkers!
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === localPeerId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '3px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: '#94a3b8',
                  }}
                >
                  <span style={{ fontWeight: 700, color: isMe ? '#38bdf8' : '#fbbf24' }}>
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span
                    style={{
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                    }}
                  >
                    {msg.senderRole}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: isMe ? 'rgba(2, 132, 199, 0.35)' : 'rgba(30, 41, 59, 0.8)',
                    border: isMe ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis & Input Form */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.95)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {['👋', '👍', '💡', '🔥', '☕'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendMessage(emoji, activeChannel)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${activeChannel === 'proximity' ? 'nearby coworkers' : 'all-hands'}...`}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(203, 213, 225, 0.2)',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              borderRadius: '8px',
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
