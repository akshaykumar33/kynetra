import { canEnter, describe, DISTRICT_LABEL, type District, type WorldMap } from '@kynetra/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toCampus, worldApi, type Campus, type CampusBuilding } from '../api';
import { useOffice } from '../state';
import { WorldScene, type WorldSelection } from './Campus';
import { LobbyScene } from './Lobby';
import { OfficeScene } from './Office';
import { HomeView } from './HomeView';

type Place =
  | { at: 'world'; focusHome?: string }
  | { at: 'home'; ownerId: string }
  | { at: 'lobby'; buildingId: string }
  | { at: 'riding'; buildingId: string; level: number }
  | { at: 'floor' };

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The whole world: the commons, the IT park towers and the street of homes, then a tower's lobby,
 * the lift and your floor. You arrive in the world; your home and your company's tower glow, and
 * the lift only goes to floors your company leases. Without a company you still have the world.
 */
export function Hub({ orgId = '' }: { orgId?: string }) {
  const world = useQuery({ queryKey: ['world'], queryFn: worldApi.get });
  const [place, setPlace] = useState<Place>({ at: 'world' });
  const campus = useMemo(() => (world.data ? toCampus(world.data, orgId) : null), [world.data, orgId]);

  if (place.at === 'floor' && orgId) {
    const mine = campus?.mine;
    return <OfficeScene onLeave={mine ? () => setPlace({ at: 'lobby', buildingId: mine.buildingId }) : undefined} />;
  }
  if (!world.data || !campus)
    return (
      <div className="hub-loading" role="status">
        {world.isError ? `Couldn't load the world: ${world.error.message}` : 'Arriving in the world…'}
      </div>
    );
  if (place.at === 'home')
    return <HomeView ownerId={place.ownerId} onLeave={() => setPlace({ at: 'world', focusHome: place.ownerId })} />;
  if (place.at === 'world' || place.at === 'floor')
    return (
      <WorldView
        world={world.data}
        campus={campus}
        orgId={orgId}
        focusHome={place.at === 'world' ? place.focusHome : undefined}
        go={setPlace}
      />
    );
  const building = campus.buildings.find(b => b.id === place.buildingId)!;
  return <LobbyView campus={campus} building={building} place={place} go={setPlace} />;
}

const DISTRICT_ORDER: District[] = ['commons', 'business', 'residential'];

function WorldView({
  world,
  campus,
  orgId,
  focusHome,
  go,
}: {
  world: WorldMap;
  campus: Campus;
  orgId: string;
  focusHome?: string;
  go: (p: Place) => void;
}) {
  // back from a visit: look at that house; no company yet: arrive looking at your own home
  const [selection, setSelection] = useState<WorldSelection>(() => {
    const home = focusHome
      ? world.homes.find(h => h.ownerId === focusHome)
      : campus.mine
        ? undefined
        : world.homes.find(h => h.mine);
    return home ? { kind: 'home', id: home.ownerId } : null;
  });
  const [district, setDistrict] = useState<District>(campus.mine && !focusHome ? 'business' : 'residential');
  const myHome = world.homes.find(h => h.mine) ?? null;
  const commons = world.buildings.filter(b => b.district === 'commons');
  const towers = campus.buildings;
  const sceneBuildings: CampusBuilding[] = [...towers, ...commons.map(b => ({ ...b, floors: [] }))];
  const myTower = towers.find(b => b.id === campus.mine?.buildingId);

  const selBuilding = selection?.kind === 'building' ? world.buildings.find(b => b.id === selection.id) : undefined;
  const selHome = selection?.kind === 'home' ? world.homes.find(h => h.ownerId === selection.id) : undefined;
  const crumbs = selBuilding
    ? describe({ district: selBuilding.district, buildingId: selBuilding.id }, { building: selBuilding.name })
    : selHome
      ? [DISTRICT_LABEL.residential, selHome.name]
      : [DISTRICT_LABEL[district]];

  const pick = (s: WorldSelection) => {
    setSelection(s);
    if (s?.kind === 'home') setDistrict('residential');
    if (s?.kind === 'building') setDistrict(world.buildings.find(b => b.id === s.id)?.district ?? 'business');
  };

  return (
    <>
      <WorldScene
        name={world.name}
        buildings={sceneBuildings}
        homes={world.homes}
        mine={campus.mine}
        selection={selection}
        onSelect={pick}
      />
      <div className="hud">
        <div className="hud-top">
          <header className="panel header">
            <p className="eyebrow">Welcome to</p>
            <h1>{world.name}</h1>
            <nav aria-label="You are here">
              <ol className="crumbs">
                {crumbs.map(c => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </nav>
            <p className="meta">
              <span>{towers.length} towers</span>
              <span>{towers.reduce((n, b) => n + b.floors.length, 0)} companies</span>
              <span>{world.homes.length} homes</span>
            </p>
            <div className="row">
              {myHome && (
                <button className="btn ghost" onClick={() => pick({ kind: 'home', id: myHome.ownerId })}>
                  Go home
                </button>
              )}
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
          <YouPanel world={world} activeOrgId={orgId} onFocusBuilding={id => pick({ kind: 'building', id })} />
          <nav className="panel towers" aria-label="Places">
            <div className="segmented" role="group" aria-label="District">
              {DISTRICT_ORDER.map(d => (
                <button key={d} aria-pressed={district === d} onClick={() => setDistrict(d)}>
                  {DISTRICT_LABEL[d]}
                </button>
              ))}
            </div>
            <ul>
              {district === 'commons' &&
                commons.map(b => (
                  <PlaceItem
                    key={b.id}
                    label={b.name}
                    detail="Open to everyone"
                    pressed={selection?.kind === 'building' && selection.id === b.id}
                    onClick={() => pick({ kind: 'building', id: b.id })}
                  />
                ))}
              {district === 'business' &&
                towers.map(b => (
                  <PlaceItem
                    key={b.id}
                    label={b.name}
                    detail={`${b.levels} floors · ${b.floors.length} ${b.floors.length === 1 ? 'company' : 'companies'}${b.id === myTower?.id ? ' · your office' : ''}`}
                    pressed={selection?.kind === 'building' && selection.id === b.id}
                    onClick={() => pick({ kind: 'building', id: b.id })}
                  />
                ))}
              {district === 'residential' &&
                world.homes.map(h => (
                  <PlaceItem
                    key={h.ownerId}
                    label={h.name}
                    detail={h.mine ? 'Your home' : h.open ? 'Open to visitors' : 'Private'}
                    pressed={selection?.kind === 'home' && selection.id === h.ownerId}
                    onClick={() => pick({ kind: 'home', id: h.ownerId })}
                  />
                ))}
            </ul>
          </nav>
        </div>
        <div className="hud-side">
          {selBuilding?.district === 'business' && (
            <Directory
              building={towers.find(b => b.id === selBuilding.id)!}
              onEnter={() => go({ at: 'lobby', buildingId: selBuilding.id })}
            />
          )}
          {selBuilding?.district === 'commons' && <CommonsCard name={selBuilding.name} />}
          {selHome && (
            <HomeCard world={world} home={selHome} onEnter={() => go({ at: 'home', ownerId: selHome.ownerId })} />
          )}
        </div>
        <div className="hud-bottom">
          <p className="panel hint-panel">
            Drag to look around · scroll to zoom · click a tower, hall or house to see what it is
          </p>
        </div>
      </div>
    </>
  );
}

function PlaceItem({
  label,
  detail,
  pressed,
  onClick,
}: {
  label: string;
  detail: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button aria-pressed={pressed} onClick={onClick}>
        <b>{label}</b>
        <small>{detail}</small>
      </button>
    </li>
  );
}

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest' } as const;

/** Who you are in the world: one person with a home, and a place in each company you belong to. */
function YouPanel({
  world,
  activeOrgId,
  onFocusBuilding,
}: {
  world: WorldMap;
  activeOrgId: string;
  onFocusBuilding: (id: string) => void;
}) {
  const { you } = world;
  return (
    <section className="panel you" aria-label="You">
      <p className="eyebrow">You</p>
      <h2>{you.name}</h2>
      {you.orgs.length === 0 ? (
        <p className="hint">
          No company yet. Your home is yours either way; an invite link from a company puts its office on your map.
        </p>
      ) : (
        <ul>
          {you.orgs.map(o => {
            const tower = o.office ? world.buildings.find(b => b.id === o.office?.buildingId) : undefined;
            return (
              <li key={o.orgId} className={o.orgId === activeOrgId ? 'mine' : undefined}>
                <b>{o.name}</b>
                <small>
                  {ROLE_LABEL[o.role]}
                  {o.team && ` · ${o.team.name}`}
                  {tower && o.office && ` · ${tower.name}, floor ${o.office.level}`}
                </small>
                {tower && (
                  <button className="link" onClick={() => onFocusBuilding(tower.id)}>
                    Show on map
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

function CommonsCard({ name }: { name: string }) {
  return (
    <section className="panel directory" aria-label={name}>
      <p className="eyebrow">{DISTRICT_LABEL.commons}</p>
      <h2>{name}</h2>
      <p className="hint">Open to everyone in the world, whichever company they are with, or none.</p>
    </section>
  );
}

const REFUSAL = {
  'private-home': 'This home is private. Its owner can invite you in.',
  'not-a-member': 'Only members can go in.',
} as const;

/** A house, and whether you may go in: the same canEnter rule the server uses. */
function HomeCard({ world, home, onEnter }: { world: WorldMap; home: WorldMap['homes'][number]; onEnter: () => void }) {
  const entry = canEnter(
    {
      userId: world.you.userId,
      memberships: world.you.orgs.map(o => ({ orgId: o.orgId, role: o.role, teamKey: o.team?.key ?? null })),
      invitedHomes: world.you.invitedHomes,
    },
    { district: 'residential', homeOwnerId: home.ownerId, homeOpen: home.open },
  );
  const message = !entry.allowed
    ? REFUSAL[entry.reason]
    : entry.as === 'owner'
      ? 'Your own place. Nobody comes in unless you invite them or open the door.'
      : home.open
        ? 'The door is open: visitors are welcome.'
        : "You're on the guest list.";
  return (
    <section className="panel directory" aria-label={home.name}>
      <p className="eyebrow">{DISTRICT_LABEL.residential}</p>
      <h2>{home.name}</h2>
      <p className="hint">{message}</p>
      {entry.allowed && (
        <button className="btn" onClick={onEnter}>
          {entry.as === 'owner' ? 'Go inside' : 'Step inside'}
        </button>
      )}
    </section>
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
            <button className="link" onClick={() => go({ at: 'world' })}>
              ← Back to the world
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
