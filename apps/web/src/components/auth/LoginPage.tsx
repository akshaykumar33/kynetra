'use client';

import React, { useState } from 'react';
import type { AdminUser, UserRole } from '@kynetra/contracts';
import { sounds } from '../hud/SoundEffects';

interface LoginPageProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
  apiBaseUrl?: string;
}

export function LoginPage({ onLoginSuccess, apiBaseUrl = 'http://localhost:4000' }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customIdent?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const targetIdentifier = (customIdent ?? identifier).trim();
    const targetPassword = customPass ?? password;

    if (!targetIdentifier) {
      setErrorMsg('Please enter your work email or system username.');
      return;
    }

    if (!targetPassword) {
      setErrorMsg('Please enter your access key password.');
      return;
    }

    setIsLoading(true);
    sounds.playKeyClick();

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: targetIdentifier,
          password: targetPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      sounds.playLevelUp();
      const authenticatedUser: AdminUser = {
        id: data.user.id,
        email: data.user.email,
        handle: data.user.handle,
        displayName: data.user.displayName,
        role: data.user.role as UserRole,
        xp: data.user.xp,
        currentDistrictId: data.user.currentDistrictId,
        statusMessage: data.user.statusMessage || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store in local storage for persistence across reloads
      if (typeof window !== 'undefined') {
        localStorage.setItem('kynetra_auth_user', JSON.stringify(authenticatedUser));
        localStorage.setItem('kynetra_auth_token', data.token);
      }

      onLoginSuccess(authenticatedUser, data.token);
    } catch (err: any) {
      sounds.playAlarmPulse();
      setErrorMsg(err.message || 'Unable to connect to Kynetra identity service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setIdentifier('admin@kynetra.dev');
    setPassword('admin');
    handleLogin(undefined, 'admin@kynetra.dev', 'admin');
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
        backgroundColor: '#0a0d14',
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 85% 85%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          linear-gradient(180deg, #0b0f19 0%, #06080d 100%)
        `,
        overflow: 'hidden',
      }}
    >
      {/* Background Cyber Grid Lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Cyber Login Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          margin: '20px',
          padding: '36px 32px',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.12)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#0f172a',
              fontWeight: 900,
              fontSize: '22px',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
              marginBottom: '14px',
              letterSpacing: '1px',
            }}
          >
            KY
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#f8fafc',
              marginBottom: '6px',
            }}
          >
            KYNETRA WORKSPACE
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Autonomous Virtual Engineering HQ
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '12px',
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={(e) => handleLogin(e)}>
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Identifier (Email or Handle)
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. admin@kynetra.dev or admin"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Access Key / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: isLoading
                ? 'rgba(245, 158, 11, 0.5)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#0f172a',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {isLoading ? 'Authenticating Clearance...' : 'Enter Workspace ➔'}
          </button>
        </form>

        {/* Quick Executive Sign In Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0 16px',
            color: '#64748b',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ padding: '0 10px' }}>Fast Clearance</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        {/* Quick Admin Button */}
        <button
          type="button"
          onClick={handleQuickAdminLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)')}
        >
          <span>👑</span> Quick Sign-In as Admin (admin@kynetra.dev)
        </button>

        {/* Security Policy Footer */}
        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          <span>Role-Gated Access strictly enforced via PostgreSQL.</span>
        </div>
      </div>
    </div>
  );
}
