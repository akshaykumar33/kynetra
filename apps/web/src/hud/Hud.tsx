import { useEffect, useState } from 'react';
import { DEMO, personById, useOffice, walkTo, walkToPerson } from '../state';
import { STATUS_COLOR } from '../world/Avatar';
import { ScreenPanel, VoicePanel } from './Voice';
import { zones, type Status } from '@knovra/shared';

const STATUS_LABEL: Record<Status, string> = {
  available: 'Available',
  meeting: 'In a meeting',
  focus: 'Focusing',
  away: 'Away',
};
const TEAMS = zones.filter(z => z.kind === 'team').map(z => [z.id, z.name.replace(/ team$/, '')] as const);
const firstName = (id: string) => personById(id)?.name.split(' ')[0] ?? 'Someone';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Header({ onLeave }: { onLeave?: () => void }) {
  const time = useClock();
  const statuses = useOffice(s => s.statuses);
  const people = useOffice(s => s.people);
  const orgName = useOffice(s => s.orgName);
  const floorName = useOffice(s => s.floorName);
  const online = useOffice(s => s.online);
  // live: connected and not away; demo: everyone not away
  const here = people.filter(p => (DEMO || online[p.id]) && statuses[p.id] !== 'away');
  const inOffice = here.filter(p => p.where === 'office').length;
  return (
    <header className="panel header">
      <p className="eyebrow">
        {orgName} · {floorName}
      </p>
      <h1>Good morning</h1>
      {onLeave && (
        <button className="link" onClick={onLeave}>
          ← Lobby
        </button>
      )}
      <p className="meta">
        <span>{time}</span>
        <span>
          <b>{here.length}</b> of {people.length} teammates in
        </span>
        <span>
          {inOffice} at the office · {here.length - inOffice} from home
        </span>
      </p>
    </header>
  );
}

function PeopleList() {
  const people = useOffice(s => s.people);
  const online = useOffice(s => s.online);
  const statuses = useOffice(s => s.statuses);
  const nearby = useOffice(s => s.nearby);
  const [open, setOpen] = useState(() => matchMedia('(min-width: 760px)').matches);
  return (
    <aside className="panel people" aria-label="People on this floor">
      <button className="people-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        People on this floor <span>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open &&
        TEAMS.map(([team, label]) => (
          <section key={team}>
            <h2>{label}</h2>
            <ul>
              {people
                .filter(p => p.team === team)
                .map(p => {
                  const st = statuses[p.id];
                  const near = nearby.includes(p.id);
                  const here = DEMO || !!online[p.id];
                  return (
                    <li key={p.id}>
                      <button
                        disabled={st === 'away' || !here}
                        onClick={() => walkToPerson(p.id)}
                        title={
                          !here
                            ? `${p.name} isn't on the floor right now`
                            : st === 'away'
                              ? `${p.name} is away`
                              : `Walk over to ${p.name}`
                        }
                      >
                        <i className="dot" style={{ background: STATUS_COLOR[st] }} />
                        <span className="who">
                          <b>{p.name}</b>
                          <small>
                            {p.role} · {STATUS_LABEL[st]}
                          </small>
                        </span>
                        {near ? (
                          <span className="chip near">Nearby</span>
                        ) : !here ? (
                          <span className="chip">Offline</span>
                        ) : (
                          <span className={`chip ${p.where}`}>{p.where === 'office' ? 'Office' : 'Home'}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
    </aside>
  );
}

function Conversation() {
  const nearby = useOffice(s => s.nearby);
  const statuses = useOffice(s => s.statuses);
  const myStatus = useOffice(s => s.myStatus);
  const zoneId = useOffice(s => s.zoneId);
  const toast = useOffice(s => s.toast);
  const [muted, setMuted] = useState(false);
  const voice = useOffice(s => s.voice);
  const voiceOn = !DEMO && voice.state === 'on';
  // with voice on, the proximity rules decide who you hear; otherwise show who is close
  const talkable = voiceOn ? voice.hearing : nearby.filter(id => statuses[id] !== 'focus');
  const focusing = nearby.filter(id => statuses[id] === 'focus');
  const zone = zones.find(z => z.id === zoneId);

  if (myStatus === 'focus') {
    return (
      <div className="panel convo quiet">
        <b>Focus mode is on.</b> People see you're focusing and can leave you a note instead of talking.
      </div>
    );
  }
  if (talkable.length) {
    return (
      <div className="panel convo live" role="status">
        <div className="faces">
          {talkable.map(id => (
            <i
              key={id}
              className={voice.speaking.includes(id) ? 'speaking' : undefined}
              style={{ background: personById(id)?.body }}
            >
              {firstName(id)[0]}
            </i>
          ))}
        </div>
        <div className="convo-text">
          <b>
            {voiceOn || DEMO ? 'Talking with' : 'Near'} {talkable.map(firstName).join(', ')}
          </b>
          <small>
            {DEMO
              ? 'Voice is simulated in demo mode.'
              : voiceOn
                ? 'Voice opens when you walk up and fades when you walk away.'
                : 'Turn on voice to talk.'}
          </small>
        </div>
        {DEMO && (
          <button className="btn ghost" aria-pressed={muted} onClick={() => setMuted(m => !m)}>
            {muted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>
    );
  }
  if (focusing.length) {
    const id = focusing[0];
    return (
      <div className="panel convo quiet">
        <span>
          <b>{firstName(id)} is focusing.</b> They won't hear you right now.
        </span>
        <button className="btn" onClick={() => toast(`Note left on ${firstName(id)}'s desk`)}>
          Leave a note
        </button>
      </div>
    );
  }
  if (zone?.kind === 'team')
    return (
      <div className="panel convo quiet">
        You're in the <b>{zone.name}</b> area. You can hear the team quietly; walk up to someone to talk.
      </div>
    );
  if (zone?.kind === 'lounge')
    return <div className="panel convo quiet">Kitchen & lounge. Anyone can drop in here for a chat.</div>;
  return null;
}

function KnockCard() {
  const knock = useOffice(s => s.knock);
  const setKnock = useOffice(s => s.setKnock);
  const toast = useOffice(s => s.toast);
  const people = useOffice(s => s.people);
  if (knock !== 'available' && knock !== 'waiting') return null;
  const inside = people.filter(p => p.status === 'meeting').map(p => p.name.split(' ')[0]);
  const doKnock = () => {
    setKnock('waiting');
    setTimeout(() => {
      if (useOffice.getState().knock !== 'waiting') return;
      setKnock('admitted');
      toast(`${inside[0]} let you in. Welcome to Sprint planning`);
    }, 1800);
  };
  return (
    <div className="panel knock" role="dialog" aria-label="Harbour room">
      <p className="eyebrow">Harbour room · door closed</p>
      <b>Sprint planning</b>
      <small>{inside.join(' and ')} are inside</small>
      <button className="btn" disabled={knock === 'waiting'} onClick={doKnock}>
        {knock === 'waiting' ? 'Knocking…' : 'Knock'}
      </button>
    </div>
  );
}

function CoffeeInvite() {
  const [show, setShow] = useState(false);
  const statuses = useOffice(s => s.statuses);
  const people = useOffice(s => s.people);
  const me = useOffice(s => s.me);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 25000);
    return () => clearTimeout(t);
  }, []);
  // someone from another team who is free right now
  const pair = people.find(p => p.team !== me?.team && statuses[p.id] === 'available');
  if (!show || !pair) return null;
  return (
    <div className="panel invite" role="dialog" aria-label="Coffee pair">
      <p className="eyebrow">Today's coffee pair</p>
      <span>
        You and <b>{pair.name.split(' ')[0]}</b> haven't chatted in a while. They're free now.
      </span>
      <div className="row">
        <button
          className="btn"
          onClick={() => {
            walkTo(-9, -6.6);
            setShow(false);
          }}
        >
          Meet in the lounge
        </button>
        <button className="btn ghost" onClick={() => setShow(false)}>
          Not today
        </button>
      </div>
    </div>
  );
}

function MyStatus() {
  const myStatus = useOffice(s => s.myStatus);
  const setMyStatus = useOffice(s => s.setMyStatus);
  return (
    <div className="panel mine">
      <label htmlFor="my-status">Your status</label>
      <div className="seg" role="radiogroup" id="my-status">
        {(['available', 'focus', 'away'] as const).map(s => (
          <button key={s} role="radio" aria-checked={myStatus === s} onClick={() => setMyStatus(s)}>
            <i className="dot" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <p className="hint">
        Move with <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> or click the floor · drag to look around
      </p>
    </div>
  );
}

function ConnectionNotice() {
  const connection = useOffice(s => s.connection);
  if (DEMO || connection === 'live') return null;
  return (
    <div className="panel convo quiet" role="status">
      {connection === 'connecting' ? 'Joining the floor…' : 'Connection lost. Reconnecting…'}
    </div>
  );
}

function Toasts() {
  const toasts = useOffice(s => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Hud({ onLeave }: { onLeave?: () => void }) {
  const toast = useOffice(s => s.toast);
  const myTeam = useOffice(s => zones.find(z => z.id === s.me?.team)?.name);
  useEffect(() => {
    const t = setTimeout(() => toast(myTeam ? `You're in. Your desk is by the ${myTeam}` : "You're in."), 900);
    return () => clearTimeout(t);
  }, [toast, myTeam]);
  return (
    <div className="hud">
      <div className="hud-top">
        <Header onLeave={onLeave} />
        <PeopleList />
      </div>
      <div className="hud-side">
        <KnockCard />
        <ScreenPanel />
        <CoffeeInvite />
      </div>
      <div className="hud-bottom">
        <MyStatus />
        <ConnectionNotice />
        {!DEMO && <VoicePanel />}
        <Conversation />
      </div>
      <Toasts />
    </div>
  );
}
