'use client';

import React, { useState } from 'react';
import { sounds } from './SoundEffects';

interface AriaConciergeModalProps {
  onClose: () => void;
  apiBase: string;
}

export function AriaConciergeModal({ onClose, apiBase }: AriaConciergeModalProps) {
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Aria (AI Concierge)',
      text: `Hello! I am Aria, the intelligent concierge and architectural guide for Kynetra. How can I assist your engineering session today?`,
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (query?: string) => {
    const text = (query || input).trim();
    if (!text) return;

    sounds.playKeyClick();
    setMessages((prev) => [
      ...prev,
      { sender: 'You', text, time: new Date().toLocaleTimeString() },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { sender: data.sender || 'Aria', text: data.reply, time: new Date().toLocaleTimeString() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'Aria', text: 'Apologies, I encountered an internal communication glitch. Please try again.', time: new Date().toLocaleTimeString() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'Aria (AI Concierge)',
          text: `You are currently in Kynetra, an Open Digital IT World. You can navigate the Innovation Tower using WASD in the 3D Viewport, or use the 2D Operations Console for high-efficiency management. Walk to any desk and press E to dock and fix code!`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '750px',
          height: '75vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          backgroundColor: '#18202c',
          border: '2px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.2)',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '12px',
          color: '#f1f5f9',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #334155',
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '14px', letterSpacing: '0.05em' }}>
                ARIA CONCIERGE &amp; SRE MENTOR
              </div>
              <div style={{ fontSize: '10px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                ONLINE • GROUNDED IN KYNETRA ARCHITECTURE
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playKeyClick();
              onClose();
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              color: '#cbd5e1',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid #475569',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Quick Question Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '12px 24px',
            borderBottom: '1px solid #334155',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
          }}
        >
          {[
            'Show Innovation Tower floor directory',
            'How do I fix connection pool starvation?',
            'Explain Kynetra tech stack',
            'What is the 3D viewport architecture?',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                backgroundColor: 'rgba(45, 58, 80, 0.85)',
                color: '#fbbf24',
                border: '1px solid #475569',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(45, 58, 80, 0.85)';
                e.currentTarget.style.borderColor = '#475569';
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#151b24',
          }}
        >
          {messages.map((m, idx) => {
            const isMe = m.sender === 'You';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                  {m.sender} • {m.time}
                </div>
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    maxWidth: '80%',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '12px',
                    backgroundColor: isMe ? '#2563eb' : '#1e293b',
                    color: '#ffffff',
                    border: isMe ? '1px solid #3b82f6' : '1px solid #334155',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div style={{ color: '#fbbf24', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
              Aria is searching technical documentation...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #334155',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask Aria anything about Kynetra, incidents, or architecture..."
            style={{
              flex: 1,
              backgroundColor: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#ffffff',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            autoFocus
          />
          <button
            onClick={() => handleSend()}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(180deg, #22c55e, #16a34a)',
              color: '#ffffff',
              fontWeight: 700,
              border: '1px solid #4ade80',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'inherit',
              boxShadow: '0 2px 0 #15803d',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
