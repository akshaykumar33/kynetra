import {
  decorFor,
  HOME_ITEM_LABEL,
  HOME_ITEMS,
  HOME_STYLE_LABEL,
  HOME_STYLES,
  NOTE_MAX,
  type HomeDecor,
  type HomeItem,
} from '@kynetra/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, homeApi, type HomeView as HomeData } from '../api';

const HomeScene = lazy(() => import('./HomeScene').then(m => ({ default: m.HomeScene })));

/** The viewer's local hour, refreshed each minute so the windows follow the day. */
function useHour() {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);
  return hour;
}

/** Inside someone's home. The owner decorates and runs the door; everyone can sign the guestbook. */
export function HomeView({ ownerId, onLeave }: { ownerId: string; onLeave: () => void }) {
  const home = useQuery({ queryKey: ['home', ownerId], queryFn: () => homeApi.get(ownerId), retry: false });
  const hour = useHour();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement | null)?.closest('input, textarea')) onLeave();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onLeave]);

  if (home.isPending)
    return (
      <div className="hub-loading" role="status">
        Opening the door…
      </div>
    );
  if (home.isError) {
    const locked = home.error instanceof ApiError && home.error.code === 'private_home';
    return (
      <div className="hub-loading" role="alert">
        <p>{locked ? 'The door is locked. This home is private; its owner can invite you in.' : home.error.message}</p>
        <button className="btn" onClick={onLeave}>
          Back to the street
        </button>
      </div>
    );
  }
  return <Inside data={home.data} hour={hour} onLeave={onLeave} />;
}

function Inside({ data, hour, onLeave }: { data: HomeData; hour: number; onLeave: () => void }) {
  const isOwner = data.as === 'owner';
  // the owner sees their changes straight away; the server copy catches up behind
  const [decor, setDecor] = useState<HomeDecor>(data.home.decor);
  const saved = JSON.stringify(data.home.decor);
  useEffect(() => setDecor(JSON.parse(saved) as HomeDecor), [saved]);

  return (
    <>
      <Suspense fallback={<div className="hub-loading">Opening the door…</div>}>
        <HomeScene decor={decor} name={data.home.name} hour={hour} />
      </Suspense>
      <div className="hud">
        <div className="hud-top">
          <header className="panel header">
            <p className="eyebrow">{isOwner ? 'Welcome home' : `Visiting ${data.owner.name}`}</p>
            <h1>{data.home.name}</h1>
            <p className="meta">
              <span>{HOME_STYLE_LABEL[decor.style]}</span>
              <span>{data.home.open ? 'Door open to visitors' : 'Private'}</span>
            </p>
            <button className="link" onClick={onLeave}>
              ← Back to the street
            </button>
          </header>
          {isOwner && <OwnerPanel data={data} decor={decor} setDecor={setDecor} />}
        </div>
        <div className="hud-side">
          <Guestbook data={data} />
        </div>
        <div className="hud-bottom">
          <p className="panel hint-panel">Drag to look around · scroll to zoom · Esc to step outside</p>
        </div>
      </div>
    </>
  );
}

function OwnerPanel({ data, decor, setDecor }: { data: HomeData; decor: HomeDecor; setDecor: (d: HomeDecor) => void }) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['home', data.home.ownerId] });
    qc.invalidateQueries({ queryKey: ['world'] });
  };
  const update = useMutation({ mutationFn: homeApi.update, onSettled: refresh });
  const [tab, setTab] = useState<'decorate' | 'guests'>('decorate');
  // the switch moves the moment you click it; the server catches up behind
  const [open, setOpen] = useState(data.home.open);
  useEffect(() => setOpen(data.home.open), [data.home.open]);

  // changes show at once; the save waits until you pause, so dragging the colour picker is one request
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { mutate } = update;
  useEffect(() => () => clearTimeout(timer.current), []);
  const save = (next: HomeDecor) => {
    setDecor(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => mutate({ decor: next }), 400);
  };
  const toggle = (item: HomeItem) =>
    save({
      ...decor,
      items: decor.items.includes(item) ? decor.items.filter(i => i !== item) : [...decor.items, item],
    });

  return (
    <section className="panel home-owner" aria-label="Your home">
      <label className="switch">
        <input
          type="checkbox"
          checked={open}
          disabled={update.isPending}
          onChange={e => {
            setOpen(e.target.checked);
            update.mutate({ open: e.target.checked });
          }}
        />
        <span>
          <b>Door open</b>
          <small>{open ? 'Anyone in Kynetra can drop by' : 'Only you and your guests'}</small>
        </span>
      </label>
      <div className="segmented" role="tablist" aria-label="Home settings">
        <button role="tab" aria-selected={tab === 'decorate'} onClick={() => setTab('decorate')}>
          Decorate
        </button>
        <button role="tab" aria-selected={tab === 'guests'} onClick={() => setTab('guests')}>
          Guests{data.guests?.length ? ` (${data.guests.length})` : ''}
        </button>
      </div>
      {tab === 'decorate' ? (
        <div role="tabpanel" aria-label="Decorate">
          <fieldset>
            <legend>Style</legend>
            <div className="chips">
              {HOME_STYLES.map(s => (
                <button key={s} aria-pressed={decor.style === s} onClick={() => save(decorFor(s))}>
                  {HOME_STYLE_LABEL[s]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field-row">
            <span>Walls</span>
            <input type="color" value={decor.wall} onChange={e => save({ ...decor, wall: e.target.value })} />
          </label>
          <fieldset>
            <legend>Furniture</legend>
            <div className="chips">
              {HOME_ITEMS.map(item => (
                <button key={item} aria-pressed={decor.items.includes(item)} onClick={() => toggle(item)}>
                  {HOME_ITEM_LABEL[item]}
                </button>
              ))}
            </div>
          </fieldset>
          {update.isError && <p className="error">Couldn't save: {update.error.message}</p>}
        </div>
      ) : (
        <Guests data={data} onChange={refresh} />
      )}
    </section>
  );
}

function Guests({ data, onChange }: { data: HomeData; onChange: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: homeApi.invite,
    onSuccess: (_r, to) => {
      setSent(to);
      setEmail('');
      onChange();
    },
  });
  const remove = useMutation({ mutationFn: homeApi.uninvite, onSettled: onChange });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) invite.mutate(email.trim());
  };
  return (
    <div role="tabpanel" aria-label="Guests">
      <form className="field-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="guest-email">
          Invite by email
        </label>
        <input
          id="guest-email"
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button className="btn" disabled={invite.isPending}>
          Invite
        </button>
      </form>
      {sent && <p className="hint">If {sent} has a Kynetra account, they can come in now.</p>}
      {invite.isError && <p className="error">{invite.error.message}</p>}
      {data.guests?.length ? (
        <ul className="guests">
          {data.guests.map(g => (
            <li key={g.id}>
              {g.name}
              <button className="link" onClick={() => remove.mutate(g.id)} aria-label={`Remove ${g.name}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No guests yet. Guests can come in even while your door is closed.</p>
      )}
    </div>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Guestbook({ data }: { data: HomeData }) {
  const qc = useQueryClient();
  const ownerId = data.home.ownerId;
  const [text, setText] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['home', ownerId] });
  const add = useMutation({
    mutationFn: (t: string) => homeApi.addNote(ownerId, t),
    onSuccess: () => {
      setText('');
      refresh();
    },
  });
  const del = useMutation({ mutationFn: (id: string) => homeApi.deleteNote(ownerId, id), onSettled: refresh });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) add.mutate(text);
  };
  return (
    <section className="panel guestbook" aria-label="Guestbook">
      <p className="eyebrow">Guestbook</p>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="note">
          Leave a note
        </label>
        <textarea
          id="note"
          rows={2}
          maxLength={NOTE_MAX}
          placeholder={
            data.as === 'owner' ? 'Pin a note for your visitors' : `Say hi to ${data.owner.name.split(' ')[0]}`
          }
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="row">
          <small>
            {text.length}/{NOTE_MAX}
          </small>
          <button className="btn" disabled={add.isPending || !text.trim()}>
            Sign
          </button>
        </div>
      </form>
      {add.isError && <p className="error">{add.error.message}</p>}
      {data.notes.length === 0 ? (
        <p className="hint">No notes yet. Be the first to sign.</p>
      ) : (
        <ol>
          {data.notes.map(n => (
            <li key={n.id}>
              <p>{n.text}</p>
              <small>
                {n.mine ? 'You' : n.author} · {when(n.createdAt)}
                {n.canDelete && (
                  <button className="link" onClick={() => del.mutate(n.id)} aria-label={`Delete note from ${n.author}`}>
                    Delete
                  </button>
                )}
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
