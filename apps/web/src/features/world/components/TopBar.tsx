'use client';

import Link from 'next/link';
import { useId } from 'react';
import { THEME_OPTIONS, useThemePreference, type ThemePreference } from '@/lib/theme';
import { useApiHealth } from '../queries';

export function TopBar() {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Kynetra world console, home">
        <BrandMark />
        <span className="brand__name">Kynetra</span>
        <span className="brand__product">World console</span>
      </Link>
      <div className="topbar__tools">
        <PlatformStatus />
        <ThemeSelect />
      </div>
    </header>
  );
}

function BrandMark() {
  // An axonometric tower: the product's landmark, drawn in three planes.
  return (
    <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 20 6.5 12 11 4 6.5Z" className="brand__mark-top" />
      <path d="M4 6.5 12 11v11l-8-4.5Z" className="brand__mark-left" />
      <path d="M20 6.5 12 11v11l8-4.5Z" className="brand__mark-right" />
    </svg>
  );
}

function PlatformStatus() {
  const health = useApiHealth();
  const state = health.isPending
    ? 'checking'
    : health.isError
      ? 'down'
      : health.data.status === 'healthy'
        ? 'ok'
        : 'degraded';
  const label = {
    checking: 'Checking platform…',
    ok: 'Platform online',
    degraded: 'Platform degraded',
    down: 'Platform unreachable',
  }[state];

  return (
    <p className="platform-status" data-state={state} role="status">
      <span className="platform-status__dot" aria-hidden="true" />
      <span className="platform-status__label">{label}</span>
    </p>
  );
}

function ThemeSelect() {
  const id = useId();
  const [preference, setPreference] = useThemePreference();
  return (
    <div className="theme-select">
      <label htmlFor={id} className="sr-only">
        Colour theme
      </label>
      <select
        id={id}
        className="select"
        value={preference}
        onChange={(e) => setPreference(e.target.value as ThemePreference)}
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
