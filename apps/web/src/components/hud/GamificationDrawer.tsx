'use client';

import React, { useState, useEffect } from 'react';
import type { GamificationProfile, LeaderboardEntry } from '@kynetra/contracts';
import { sounds } from './SoundEffects';

interface GamificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
}

export function GamificationDrawer({ isOpen, onClose, apiBase }: GamificationDrawerProps) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'leaderboard'>('profile');

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        const [profRes, leadRes] = await Promise.all([
          fetch(`${apiBase}/api/v1/gamification/profile/developer`),
          fetch(`${apiBase}/api/v1/gamification/leaderboard`),
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(profData);
        }
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          setLeaderboard(leadData.leaderboard || []);
        }
      } catch {
        // Local fallback
      }
    };

    fetchData();
  }, [isOpen, apiBase]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 20, 28, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: '#18202c',
          borderLeft: '2px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '12px',
          color: '#f1f5f9',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #334155',
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>🏆</span>
            <div>
              <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '14px', letterSpacing: '0.05em' }}>
                DEVELOPER PROGRESSION
              </div>
              <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px' }}>XP ENGINE &amp; SKILL BADGES</div>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playKeyClick();
              onClose();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#cbd5e1',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid #475569',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', backgroundColor: 'rgba(30, 41, 59, 0.6)' }}>
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('profile'); }}
            style={{
              flex: 1,
              padding: '14px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'profile' ? '#fbbf24' : '#94a3b8',
              backgroundColor: activeTab === 'profile' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Developer Profile
          </button>
          <button
            onClick={() => { sounds.playKeyClick(); setActiveTab('leaderboard'); }}
            style={{
              flex: 1,
              padding: '14px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              borderBottom: activeTab === 'leaderboard' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'leaderboard' ? '#fbbf24' : '#94a3b8',
              backgroundColor: activeTab === 'leaderboard' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            District Leaderboard
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#151b24' }}>
          {activeTab === 'profile' && profile && (
            <>
              {/* Profile Card */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: '#1e2633',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 800,
                      color: '#ffffff',
                      backgroundColor: profile.avatarColor || '#d97706',
                      border: '2px solid #f59e0b',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {profile.displayName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px' }}>{profile.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>{profile.rankTitle}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Handle: @{profile.handle}</div>
                  </div>
                </div>

                {/* Level & XP Bar */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, color: '#fbbf24' }}>LEVEL {profile.level}</span>
                    <span style={{ color: '#cbd5e1' }}>
                      {profile.currentXp} / {profile.nextLevelXp} XP
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', borderRadius: '4px', backgroundColor: '#0f172a', overflow: 'hidden', border: '1px solid #334155' }}>
                    <div
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #f59e0b, #22c55e)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                        width: `${Math.min(100, (profile.currentXp / profile.nextLevelXp) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  System Stats &amp; Contributions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#1e2633', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>INCIDENTS RESOLVED</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                      {profile.stats.incidentsResolved}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#1e2633', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>ARENA MATCHES WON</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
                      {profile.stats.arenaMatchesWon}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#1e2633', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>PATCHES MERGED</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                      {profile.stats.codePatchesSubmitted}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#1e2633', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>UPTIME HOURS</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                      {profile.stats.uptimeContributionHours}h
                    </div>
                  </div>
                </div>
              </div>

              {/* Unlocked Badges */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Skill Badges Unlocked ({profile.badges.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {profile.badges.map((badge) => (
                    <div
                      key={badge.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#1e2633',
                        border: '1px solid #334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{badge.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '12px' }}>{badge.name}</div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>{badge.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                Top engineers ranked by verified incident mitigations and simulation points across all 4 districts.
              </div>

              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: entry.handle === 'developer' ? '1px solid #f59e0b' : '1px solid #334155',
                    backgroundColor: entry.handle === 'developer' ? 'rgba(245, 158, 11, 0.12)' : '#1e2633',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '12px',
                        backgroundColor:
                          entry.rank === 1
                            ? '#f59e0b'
                            : entry.rank === 2
                            ? '#94a3b8'
                            : entry.rank === 3
                            ? '#b45309'
                            : '#334155',
                        color: entry.rank <= 2 ? '#000000' : '#ffffff',
                      }}
                    >
                      {entry.rank}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{entry.displayName}</span>
                        {entry.handle === 'developer' && (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f59e0b', fontSize: '9px', color: '#000', fontWeight: 800 }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{entry.rankTitle}</div>
                      <div style={{ fontSize: '10px', color: '#fbbf24' }}>{entry.districtAffiliation}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '13px' }}>{entry.totalXp} XP</div>
                    <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600 }}>{entry.incidentsResolved} Solved</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
