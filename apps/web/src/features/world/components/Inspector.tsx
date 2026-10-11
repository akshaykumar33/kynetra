'use client';

import type { InnovationTowerFloor, InteractiveNode, WorldDistrict } from '@kynetra/contracts';
import type { ResolvedSelection } from '../selection';
import { occupancyRatio } from '../selection';
import { NODE_TYPE_LABEL, formatCount } from '../labels';
import { StatusPill } from './DistrictRail';

interface InspectorProps {
  selection: ResolvedSelection;
  /** Offered when the 3D lens exists but isn't the one on screen. */
  onShowInCity: (() => void) | null;
  onSelectFloor: (floorNumber: number | null) => void;
  onSelectNode: (nodeId: string | null) => void;
  onGoToDistrict: (districtId: string) => void;
  fallbackDistrictId: string | null;
}

/** Everything about the current selection: district → floor directory → nodes. */
export function Inspector({
  selection,
  onShowInCity,
  onSelectFloor,
  onSelectNode,
  onGoToDistrict,
  fallbackDistrictId,
}: InspectorProps) {
  const { district, floor, node } = selection;
  if (!district) return null;

  const floors = district.floors ?? [];

  return (
    <aside className="panel inspector" aria-labelledby="inspector-title">
      <header className="inspector__header">
        <div className="inspector__title-row">
          <h2 id="inspector-title" className="inspector__title">
            {district.name}
          </h2>
          <StatusPill status={district.status} />
        </div>
        <p className="inspector__desc">{district.description}</p>
        <dl className="facts">
          <div>
            <dt>Landmark</dt>
            <dd>{district.keyLandmark}</dd>
          </div>
          <div>
            <dt>Online</dt>
            <dd className="mono">{formatCount(district.activeUsers)}</dd>
          </div>
        </dl>
      </header>

      {floors.length === 0 ? (
        <UnmappedDistrict
          district={district}
          fallbackDistrictId={fallbackDistrictId}
          onGoToDistrict={onGoToDistrict}
        />
      ) : floor ? (
        <FloorDetail
          floor={floor}
          landmark={district.keyLandmark}
          node={node}
          onBack={() => onSelectFloor(null)}
          onSelectNode={onSelectNode}
          onShowInCity={onShowInCity}
        />
      ) : (
        <FloorDirectory floors={floors} landmark={district.keyLandmark} onSelect={onSelectFloor} />
      )}
    </aside>
  );
}

function FloorDirectory({
  floors,
  landmark,
  onSelect,
}: {
  floors: InnovationTowerFloor[];
  landmark: string;
  onSelect: (floorNumber: number) => void;
}) {
  // Read top-down, the way a building directory in a lobby does.
  const ordered = [...floors].sort((a, b) => b.floorNumber - a.floorNumber);
  return (
    <section className="inspector__section" aria-labelledby="directory-title">
      <h3 id="directory-title" className="eyebrow">
        {landmark} · Directory
      </h3>
      <ul className="directory">
        {ordered.map((f) => (
          <li key={f.floorNumber}>
            <button
              type="button"
              className="directory__item"
              onClick={() => onSelect(f.floorNumber)}
            >
              <span className="directory__level mono" aria-hidden="true">
                {String(f.floorNumber).padStart(2, '0')}
              </span>
              <span className="directory__body">
                <span className="directory__name">
                  <span className="sr-only">Floor {f.floorNumber}: </span>
                  {f.name}
                </span>
                <Occupancy floor={f} compact />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FloorDetail({
  floor,
  landmark,
  node,
  onBack,
  onSelectNode,
  onShowInCity,
}: {
  floor: InnovationTowerFloor;
  landmark: string;
  node: InteractiveNode | null;
  onBack: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onShowInCity: (() => void) | null;
}) {
  return (
    <section className="inspector__section" aria-labelledby="floor-title">
      <button type="button" className="btn btn--ghost btn--back" onClick={onBack}>
        <span aria-hidden="true">←</span> {landmark} directory
      </button>
      <div>
        <p className="eyebrow">Floor {floor.floorNumber}</p>
        <h3 id="floor-title" className="inspector__subtitle">
          {floor.name}
        </h3>
        <p className="inspector__desc">{floor.description}</p>
      </div>
      <Occupancy floor={floor} />

      <h4 className="eyebrow">On this floor</h4>
      {floor.nodes.length === 0 ? (
        <p className="inline-empty">
          Nothing is installed on this floor yet. Workstations appear here as soon as the World
          Engine places them.
        </p>
      ) : (
        <ul className="nodes">
          {floor.nodes.map((n) => {
            const isSelected = n.id === node?.id;
            return (
              <li key={n.id} className="node" data-selected={isSelected || undefined}>
                <button
                  type="button"
                  className="node__select"
                  aria-pressed={isSelected}
                  onClick={() => onSelectNode(isSelected ? null : n.id)}
                >
                  <span className="node__type">{NODE_TYPE_LABEL[n.type]}</span>
                  <span className="node__name">{n.name}</span>
                  <span className="node__desc">{n.description}</span>
                  <span className="node__sessions">
                    <span className="mono">{formatCount(n.activeSessionCount)}</span>{' '}
                    {n.activeSessionCount === 1 ? 'active session' : 'active sessions'}
                  </span>
                </button>
                {isSelected && onShowInCity && (
                  <button
                    type="button"
                    className="btn btn--primary node__action"
                    onClick={onShowInCity}
                  >
                    Show in 3D city
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Occupancy({ floor, compact = false }: { floor: InnovationTowerFloor; compact?: boolean }) {
  const ratio = occupancyRatio(floor);
  const percent = Math.round(ratio * 100);
  const level = ratio >= 0.9 ? 'high' : ratio >= 0.6 ? 'medium' : 'low';
  return (
    <div className="occupancy" data-compact={compact || undefined} data-level={level}>
      {!compact && <span className="occupancy__label">Occupancy</span>}
      <div
        className="occupancy__track"
        role="meter"
        aria-label={`${floor.name} occupancy`}
        aria-valuemin={0}
        aria-valuemax={floor.capacity}
        aria-valuenow={floor.currentOccupancy}
        aria-valuetext={`${floor.currentOccupancy} of ${floor.capacity} places, ${percent}%`}
      >
        <span className="occupancy__fill" style={{ inlineSize: `${percent}%` }} />
      </div>
      <span className="occupancy__value mono">
        {formatCount(floor.currentOccupancy)} / {formatCount(floor.capacity)}
      </span>
    </div>
  );
}

function UnmappedDistrict({
  district,
  fallbackDistrictId,
  onGoToDistrict,
}: {
  district: WorldDistrict;
  fallbackDistrictId: string | null;
  onGoToDistrict: (districtId: string) => void;
}) {
  return (
    <section className="inspector__section empty-block">
      <h3 className="inspector__subtitle">No interiors mapped yet</h3>
      <p className="inspector__desc">
        {district.status === 'active'
          ? `${district.name} is open, but the World Engine hasn’t published floor plans for ${district.keyLandmark} yet.`
          : `${district.name} is still being built. Floor plans for ${district.keyLandmark} are published once construction finishes.`}
      </p>
      {fallbackDistrictId && fallbackDistrictId !== district.id && (
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onGoToDistrict(fallbackDistrictId)}
        >
          Explore a mapped district
        </button>
      )}
    </section>
  );
}
