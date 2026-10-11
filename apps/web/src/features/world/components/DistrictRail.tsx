'use client';

import type { WorldDistrict } from '@kynetra/contracts';
import { DISTRICT_STATUS_LABEL, formatCount } from '../labels';

interface DistrictRailProps {
  districts: WorldDistrict[];
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
}

/** Quick travel: every district one click (or one Tab + Enter) away. */
export function DistrictRail({
  districts,
  selectedDistrictId,
  onSelectDistrict,
}: DistrictRailProps) {
  return (
    <nav className="panel rail" aria-labelledby="rail-title">
      <h2 id="rail-title" className="eyebrow rail__title">
        Districts
      </h2>
      <ul className="rail__list">
        {districts.map((district) => {
          const isSelected = district.id === selectedDistrictId;
          return (
            <li key={district.id}>
              <button
                type="button"
                className="rail__item"
                aria-pressed={isSelected}
                onClick={() => onSelectDistrict(district.id)}
              >
                <span className="rail__row">
                  <span className="rail__name">{district.name}</span>
                  <span className="rail__online mono">{formatCount(district.activeUsers)}</span>
                </span>
                <span className="rail__row">
                  <span className="rail__theme">{district.theme}</span>
                  <StatusPill status={district.status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StatusPill({ status }: { status: WorldDistrict['status'] }) {
  return (
    <span className="status-pill" data-status={status}>
      <span className="status-pill__dot" aria-hidden="true" />
      {DISTRICT_STATUS_LABEL[status]}
    </span>
  );
}
