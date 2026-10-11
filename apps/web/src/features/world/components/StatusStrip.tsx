'use client';

import type { WorldSummary } from '../selection';
import { formatCount, formatTime } from '../labels';

interface StatusStripProps {
  summary: WorldSummary;
  updatedAt: number;
  isRefreshing: boolean;
}

/** Headline world numbers — every one derived from live platform data. */
export function StatusStrip({ summary, updatedAt, isRefreshing }: StatusStripProps) {
  return (
    <section className="status-strip" aria-label="World at a glance">
      <Stat label="Online now" value={formatCount(summary.onlineNow)} />
      <Stat
        label="Districts operational"
        value={`${summary.districtsOperational} / ${summary.districtsTotal}`}
      />
      <Stat label="Live sessions" value={formatCount(summary.liveSessions)} />
      <p className="status-strip__updated" aria-live="off">
        <span
          className="status-strip__sync"
          data-active={isRefreshing || undefined}
          aria-hidden="true"
        />
        {isRefreshing ? 'Refreshing…' : `Updated ${formatTime(updatedAt)}`}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value mono">{value}</span>
    </div>
  );
}
