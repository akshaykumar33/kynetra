'use client';

import { useMemo, type KeyboardEvent } from 'react';
import type { WorldDistrict } from '@kynetra/contracts';
import { DISTRICT_RADIUS, districtBlocks, districtCenter, worldBounds } from '../geometry';
import { DISTRICT_STATUS_LABEL, formatCount } from '../labels';

interface CityMapProps {
  districts: WorldDistrict[];
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
}

/** Tallest generated block, used to shade the plan so height still reads in 2D. */
const MAX_BLOCK_HEIGHT = 4;

/**
 * The 2D lens: a top-down plan of the same footprints the 3D city renders.
 * Every district plot is a keyboard-operable button.
 */
export function CityMap({ districts, selectedDistrictId, onSelectDistrict }: CityMapProps) {
  const bounds = useMemo(() => worldBounds(districts), [districts]);
  const plots = useMemo(
    () =>
      districts.map((district) => ({
        district,
        center: districtCenter(district),
        blocks: districtBlocks(district),
      })),
    [districts],
  );

  const onKey = (event: KeyboardEvent, districtId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectDistrict(districtId);
    }
  };

  return (
    <svg
      className="city-map"
      viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="City map of Kynetra districts"
    >
      <defs>
        <pattern id="city-map-grid" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
          <path d="M 2.2 0 L 0 0 0 2.2" className="city-map__grid-line" />
        </pattern>
      </defs>
      <rect
        x={bounds.minX}
        y={bounds.minZ}
        width={bounds.width}
        height={bounds.height}
        fill="url(#city-map-grid)"
      />

      {plots
        .filter(({ center }) => center[0] !== 0 || center[1] !== 0)
        .map(({ district, center }) => (
          <line
            key={`road-${district.id}`}
            x1={0}
            y1={0}
            x2={center[0]}
            y2={center[1]}
            className="city-map__road"
          />
        ))}

      {plots.map(({ district, center, blocks }) => {
        const isSelected = district.id === selectedDistrictId;
        return (
          <g
            key={district.id}
            className="city-map__plot"
            data-status={district.status}
            data-selected={isSelected || undefined}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${district.name}, ${DISTRICT_STATUS_LABEL[district.status]}, ${formatCount(district.activeUsers)} online`}
            onClick={() => onSelectDistrict(district.id)}
            onKeyDown={(event) => onKey(event, district.id)}
          >
            <circle
              cx={center[0]}
              cy={center[1]}
              r={DISTRICT_RADIUS + 0.6}
              className="city-map__plot-ring"
            />
            {blocks.map((block, i) => (
              <rect
                key={i}
                x={block.x - block.width / 2}
                y={block.z - block.depth / 2}
                width={block.width}
                height={block.depth}
                rx={0.1}
                className="city-map__block"
                style={{ opacity: 0.45 + 0.55 * Math.min(1, block.height / MAX_BLOCK_HEIGHT) }}
              />
            ))}
            {district.floors && district.floors.length > 0 && (
              <rect
                x={center[0] - 1.4}
                y={center[1] - 1.4}
                width={2.8}
                height={2.8}
                rx={0.2}
                className="city-map__landmark"
              />
            )}
            <text
              x={center[0]}
              y={center[1] + DISTRICT_RADIUS + 2.2}
              textAnchor="middle"
              className="city-map__label"
            >
              {district.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
