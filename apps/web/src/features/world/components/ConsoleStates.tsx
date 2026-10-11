'use client';

import { Component, type ReactNode } from 'react';
import { describeApiError } from '../api';
import { formatTime } from '../labels';

/** Loading: the real layout's shape, so nothing shifts when data lands. */
export function ConsoleSkeleton() {
  return (
    <div className="console" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the world…
      </p>
      <div className="status-strip" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stat">
            <span className="skeleton skeleton--text" style={{ inlineSize: '7rem' }} />
            <span className="skeleton skeleton--value" />
          </div>
        ))}
      </div>
      <div className="panel rail" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="skeleton skeleton--row" />
        ))}
      </div>
      <div className="viewport" aria-hidden="true">
        <span className="skeleton skeleton--fill" />
      </div>
      <div className="panel inspector" aria-hidden="true">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--text" />
        <span className="skeleton skeleton--text" style={{ inlineSize: '70%' }} />
        {[0, 1, 2].map((i) => (
          <span key={i} className="skeleton skeleton--row" />
        ))}
      </div>
    </div>
  );
}

/** Error with nothing to show: what failed, in words, and a way to retry. */
export function ConsoleError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { title, detail } = describeApiError(error);
  return (
    <div className="console-message" role="alert">
      <h2 className="console-message__title">{title}</h2>
      <p className="console-message__detail">{detail}</p>
      <button type="button" className="btn btn--primary" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}

/** Empty: the platform answered, but the world has no districts. */
export function ConsoleEmpty({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="console-message">
      <h2 className="console-message__title">No districts have been built yet</h2>
      <p className="console-message__detail">
        The platform is online but the World Engine hasn’t published any districts. They appear here
        as soon as the world is seeded.
      </p>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={onRefresh}
        disabled={refreshing}
      >
        {refreshing ? 'Checking…' : 'Check again'}
      </button>
    </div>
  );
}

/** Partial/stale: keep showing what we have, and say plainly it may be out of date. */
export function StaleBanner({
  error,
  updatedAt,
  onRetry,
  retrying,
}: {
  error: unknown;
  updatedAt: number;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { title } = describeApiError(error);
  return (
    <div className="banner" role="status">
      <p>
        <strong>{title}.</strong> Showing the world as of {formatTime(updatedAt)} — counts may be
        out of date.
      </p>
      <button
        type="button"
        className="btn btn--secondary btn--small"
        onClick={onRetry}
        disabled={retrying}
      >
        {retrying ? 'Reconnecting…' : 'Reconnect'}
      </button>
    </div>
  );
}

interface SceneBoundaryProps {
  children: ReactNode;
  onFallbackToMap: () => void;
}

/** A crash inside the 3D lens must never take the console down with it. */
export class SceneErrorBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Surfaced to the console until the web app has a telemetry client (Phase 01).
    console.error('3D lens crashed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="viewport-message" role="alert">
        <h3 className="console-message__title">The 3D city stopped rendering</h3>
        <p className="console-message__detail">
          Your graphics driver or browser ran into a problem. Everything is still available on the
          map.
        </p>
        <button type="button" className="btn btn--primary" onClick={this.props.onFallbackToMap}>
          Switch to the map
        </button>
      </div>
    );
  }
}
