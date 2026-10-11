'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/flags';
import { IS_PRODUCTION } from '@/lib/env';
import { ApiError } from '../api';
import { useDistricts } from '../queries';
import { resolveSelection, summarizeWorld } from '../selection';
import { useWorldView, type CameraCommandType, type Lens } from '../store';
import { useWebGLSupport } from '../hooks/useWebGLSupport';
import { CityMap } from './CityMap';
import { DistrictRail } from './DistrictRail';
import { Inspector } from './Inspector';
import { StatusStrip } from './StatusStrip';
import {
  ConsoleEmpty,
  ConsoleError,
  ConsoleSkeleton,
  SceneErrorBoundary,
  StaleBanner,
} from './ConsoleStates';

// three.js is only downloaded when the 3D lens is actually shown.
const CityScene = dynamic(() => import('../scene/CityScene'), {
  ssr: false,
  loading: () => <span className="skeleton skeleton--fill" aria-hidden="true" />,
});

type ForcedState = 'loading' | 'empty' | 'error' | 'stale';
const FORCED_STATES: readonly ForcedState[] = ['loading', 'empty', 'error', 'stale'];

/**
 * Review aid (§13.1): `?state=loading|empty|error|stale` renders that state
 * against real data. Compiled out of production builds.
 */
function useForcedState(): ForcedState | null {
  const params = useSearchParams();
  if (IS_PRODUCTION) return null;
  const value = params.get('state');
  return FORCED_STATES.find((s) => s === value) ?? null;
}

const CAMERA_BUTTONS: readonly [CameraCommandType, string, string][] = [
  ['zoom-in', 'Zoom in', '+'],
  ['zoom-out', 'Zoom out', '−'],
  ['orbit-left', 'Orbit left', '↺'],
  ['orbit-right', 'Orbit right', '↻'],
  ['reset', 'Reset camera', '⌖'],
];

const FORCED_ERROR = new ApiError('network', 'forced for review');

export function WorldConsole() {
  const query = useDistricts();
  const forced = useForcedState();

  if (forced === 'loading' || query.isPending) return <ConsoleSkeleton />;

  if (forced === 'error' || (query.isError && !query.data)) {
    return (
      <ConsoleError
        error={query.error ?? FORCED_ERROR}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const districts = forced === 'empty' ? [] : query.data.districts;
  if (districts.length === 0) {
    return <ConsoleEmpty onRefresh={() => void query.refetch()} refreshing={query.isFetching} />;
  }

  const staleError = forced === 'stale' ? FORCED_ERROR : query.isError ? query.error : null;

  return (
    <LoadedConsole
      districts={districts}
      totalActiveUsers={query.data.totalActiveUsers}
      updatedAt={query.dataUpdatedAt}
      isRefreshing={query.isFetching}
      staleError={staleError}
      onRetry={() => void query.refetch()}
    />
  );
}

interface LoadedConsoleProps {
  districts: Parameters<typeof resolveSelection>[0];
  totalActiveUsers: number;
  updatedAt: number;
  isRefreshing: boolean;
  staleError: unknown;
  onRetry: () => void;
}

function LoadedConsole({
  districts,
  totalActiveUsers,
  updatedAt,
  isRefreshing,
  staleError,
  onRetry,
}: LoadedConsoleProps) {
  const view = useWorldView();
  const webgl = useWebGLSupport();
  const cityAvailable = isFeatureEnabled('3d-world') && webgl !== false;
  const lens: Lens = cityAvailable ? view.lens : 'map';
  // The canvas mounts on first visit and then stays, so switching back is instant.
  const [cityMounted, setCityMounted] = useState(lens === 'city');
  if (lens === 'city' && !cityMounted) setCityMounted(true);

  const selection = resolveSelection(districts, view);
  const summary = summarizeWorld(districts, totalActiveUsers);
  const mappedDistrict = districts.find((d) => d.floors && d.floors.length > 0) ?? null;

  const { selectFloor, selectNode, nodeId, floorNumber } = view;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [role="dialog"]')) return;
      if (nodeId) selectNode(null);
      else if (floorNumber !== null) selectFloor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nodeId, floorNumber, selectNode, selectFloor]);

  const announcement = [
    selection.district?.name,
    selection.floor && `Floor ${selection.floor.floorNumber}, ${selection.floor.name}`,
    selection.node?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="console">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <StatusStrip summary={summary} updatedAt={updatedAt} isRefreshing={isRefreshing} />
      {staleError !== null && (
        <StaleBanner
          error={staleError}
          updatedAt={updatedAt}
          onRetry={onRetry}
          retrying={isRefreshing}
        />
      )}

      <DistrictRail
        districts={districts}
        selectedDistrictId={selection.district?.id ?? null}
        onSelectDistrict={view.selectDistrict}
      />

      <section className="viewport" aria-label="World view">
        <div className="viewport__toolbar">
          {cityAvailable ? (
            <div className="segmented" role="group" aria-label="View">
              <button
                type="button"
                className="segmented__option"
                aria-pressed={lens === 'city'}
                onClick={() => view.setLens('city')}
              >
                3D city
              </button>
              <button
                type="button"
                className="segmented__option"
                aria-pressed={lens === 'map'}
                onClick={() => view.setLens('map')}
              >
                Map
              </button>
            </div>
          ) : (
            <p className="viewport__note">
              {webgl === false
                ? 'This device can’t display the 3D city, so you’re seeing the map.'
                : 'Map view'}
            </p>
          )}
        </div>

        <div className="lens" data-active={lens === 'map' || undefined} inert={lens !== 'map'}>
          <CityMap
            districts={districts}
            selectedDistrictId={selection.district?.id ?? null}
            onSelectDistrict={view.selectDistrict}
          />
        </div>

        {cityAvailable && cityMounted && (
          <div
            className="lens lens--city"
            data-active={lens === 'city' || undefined}
            inert={lens !== 'city'}
            role="region"
            aria-label={`3D city view${announcement ? ` focused on ${announcement}` : ''}. Every action here is also available from the district list and inspector.`}
          >
            <SceneErrorBoundary onFallbackToMap={() => view.setLens('map')}>
              <CityScene
                districts={districts}
                selection={selection}
                active={lens === 'city'}
                cameraCommand={view.cameraCommand}
                onSelectDistrict={view.selectDistrict}
                onSelectFloor={view.selectFloor}
                onSelectNode={view.selectNode}
              />
            </SceneErrorBoundary>
            <div className="camera-controls" role="group" aria-label="Camera">
              {CAMERA_BUTTONS.map(([type, label, glyph]) => (
                <button
                  key={type}
                  type="button"
                  className="camera-controls__button"
                  aria-label={label}
                  title={label}
                  onClick={() => view.sendCameraCommand(type)}
                >
                  <span aria-hidden="true">{glyph}</span>
                </button>
              ))}
            </div>
            <p className="viewport__hint" aria-hidden="true">
              Drag to orbit · Scroll to zoom · Click a floor to look inside · Esc to step back
            </p>
          </div>
        )}
      </section>

      <Inspector
        selection={selection}
        onShowInCity={cityAvailable && lens !== 'city' ? () => view.setLens('city') : null}
        onSelectFloor={view.selectFloor}
        onSelectNode={view.selectNode}
        onGoToDistrict={view.selectDistrict}
        fallbackDistrictId={mappedDistrict?.id ?? null}
      />
    </div>
  );
}
