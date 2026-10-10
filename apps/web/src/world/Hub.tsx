import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { campusApi, type Campus, type CampusBuilding } from '../api';
import { useOffice } from '../state';
import { CampusScene } from './Campus';
import { LobbyScene } from './Lobby';
import { OfficeScene } from './Office';

type Place =
  | { at: 'campus' }
  | { at: 'lobby'; buildingId: string }
  | { at: 'riding'; buildingId: string; level: number }
  | { at: 'floor' };

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The whole hub: the IT park campus, a tower's lobby, the lift, and your floor. You arrive on the
 * campus; your tower glows, and the lift only goes to floors your company leases.
 */
export function Hub() {
  const orgId = useOffice(s => s.orgId);
  const campus = useQuery({ queryKey: ['campus', orgId], queryFn: () => campusApi.get(orgId), enabled: !!orgId });
  const [place, setPlace] = useState<Place>({ at: 'campus' });

  if (place.at === 'floor') {
    const mine = campus.data?.mine;
    return <OfficeScene onLeave={mine ? () => setPlace({ at: 'lobby', buildingId: mine.buildingId }) : undefined} />;
  }
  if (!campus.data)
    return (
      <div className="hub-loading" role="status">
        {campus.isError ? `Couldn't load the campus: ${campus.error.message}` : 'Arriving at the hub…'}
      </div>
    );
  if (place.at === 'campus') return <CampusView campus={campus.data} go={setPlace} />;
  const building = campus.data.buildings.find(b => b.id === place.buildingId)!;
  return <LobbyView campus={campus.data} building={building} place={place} go={setPlace} />;
}

function CampusView({ campus, go }: { campus: Campus; go: (p: Place) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = campus.buildings.find(b => b.id === selectedId) ?? null;
  const myTower = campus.buildings.find(b => b.id === campus.mine?.buildingId);
  const orgName = useOffice(s => s.orgName);
  return (
    <>
      <CampusScene campus={campus} selectedId={selectedId} onSelect={setSelectedId} />
      <div className="hud">
        <div className="hud-top">
          <header className="panel header">
            <p className="eyebrow">Welcome to</p>
            <h1>{campus.name}</h1>
            <p className="meta">
              <span>{campus.buildings.length} towers</span>
              <span>{campus.buildings.reduce((n, b) => n + b.floors.length, 0)} companies</span>
              {myTower && (
                <span>
                  {orgName} is in <b>{myTower.name}</b>, floor {campus.mine!.level}
                </span>
              )}
            </p>
            <div className="row">
              {myTower && (
                <button className="btn" onClick={() => go({ at: 'lobby', buildingId: myTower.id })}>
                  Walk to {myTower.name}
                </button>
              )}
              {campus.mine && (
                <button className="btn ghost" onClick={() => go({ at: 'floor' })}>
                  Go straight to my desk
                </button>
              )}
            </div>
          </header>
          <nav className="panel towers" aria-label="Towers">
            <h2>Towers</h2>
            <ul>
              {campus.buildings.map(b => (
                <li key={b.id}>
                  <button
                    aria-pressed={b.id === selectedId}
                    onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                  >
                    <b>{b.name}</b>
                    <small>
                      {b.levels} floors · {b.floors.length} {b.floors.length === 1 ? 'company' : 'companies'}
                      {b.id === myTower?.id && ' · your office'}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="hud-side">
          {selected && <Directory building={selected} onEnter={() => go({ at: 'lobby', buildingId: selected.id })} />}
        </div>
        <div className="hud-bottom">
          <p className="panel hint-panel">
            Drag to look around · scroll to zoom · click a tower to see who works there
          </p>
        </div>
      </div>
    </>
  );
}

/** The directory board you'd see in a real lobby: who is on which floor. */
function Directory({ building, onEnter }: { building: CampusBuilding; onEnter: () => void }) {
  const byLevel = [...building.floors].sort((a, b) => b.level - a.level);
  return (
    <section className="panel directory" aria-label={`${building.name} directory`}>
      <p className="eyebrow">Directory</p>
      <h2>{building.name}</h2>
      <ol>
        {byLevel.map(f => (
          <li key={f.level} className={f.mine ? 'mine' : undefined}>
            <span className="lvl">{f.level}</span>
            {f.tenant}
            {f.mine && <small> · your office</small>}
          </li>
        ))}
      </ol>
      <button className="btn" onClick={onEnter}>
        Enter the lobby
      </button>
    </section>
  );
}

function LobbyView({
  campus,
  building,
  place,
  go,
}: {
  campus: Campus;
  building: CampusBuilding;
  place: Place;
  go: (p: Place) => void;
}) {
  const me = useOffice(s => s.me);
  const liftOpen = useRef(1);
  const riding = place.at === 'riding' ? place : null;

  // doors close, the lift rises, then you step out on your floor
  useEffect(() => {
    if (!riding) {
      liftOpen.current = 1;
      return;
    }
    const quick = reduceMotion();
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      liftOpen.current = Math.max(0, 1 - (now - start) / 700);
      if (liftOpen.current > 0) raf = requestAnimationFrame(tick);
    };
    if (!quick) raf = requestAnimationFrame(tick);
    const t = setTimeout(() => go({ at: 'floor' }), quick ? 0 : 2000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [riding, go]);

  const levels = Array.from({ length: building.levels }, (_, i) => building.levels - i);
  return (
    <>
      <LobbyScene building={building} me={me} liftOpen={liftOpen} />
      <div className="hud">
        <div className="hud-top">
          <header className="panel header">
            <p className="eyebrow">{campus.name}</p>
            <h1>{building.name}</h1>
            <button className="link" onClick={() => go({ at: 'campus' })}>
              ← Back to the campus
            </button>
          </header>
          <section className="panel lift" aria-label="Lift">
            <h2>Lift</h2>
            <p className="hint">Choose a floor. The lift only stops where you're expected.</p>
            <ol>
              {levels.map(level => {
                const f = building.floors.find(x => x.level === level);
                return (
                  <li key={level}>
                    <button
                      disabled={!f?.mine || !!riding}
                      onClick={() => go({ at: 'riding', buildingId: building.id, level })}
                      aria-label={f?.mine ? `Floor ${level}, ${f.tenant}, your office` : `Floor ${level}`}
                    >
                      <span className="lvl">{level}</span>
                      <span>
                        {f ? f.tenant : 'Vacant'}
                        <small>{f?.mine ? 'Your office' : f ? 'Invite only' : ''}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
      {riding && (
        <div className="riding" role="status">
          Going up to floor {riding.level}…
        </div>
      )}
    </>
  );
}
