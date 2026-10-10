import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, type Avatar, type FloorData } from '../api';

const BODY = ['#2f6f8f', '#e07a5f', '#3d8a7a', '#8d6cab', '#d9a441', '#c45d7a'];
const SKIN = ['#f3d3b8', '#e2b48f', '#d6a07a', '#b67c56', '#7a4b2f', '#5a3420'];
const HAIR = ['#151515', '#3a2416', '#7a4a26', '#c9a46b', '#a3a3a3'];

function Swatches({
  label,
  name,
  colors,
  value,
  onChange,
}: {
  label: string;
  name: string;
  colors: string[];
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <fieldset className="swatches">
      <legend>{label}</legend>
      {colors.map((c, i) => (
        <label key={c} className="swatch" style={{ background: c }}>
          <input type="radio" name={name} value={c} checked={value === c} onChange={() => onChange(c)} />
          <span className="sr-only">
            {label} option {i + 1}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** First visit: pick a look, a team and how you work, then walk in. */
export function Onboarding({ data }: { data: FloorData }) {
  const qc = useQueryClient();
  const me = data.people.find(p => p.id === data.meId);
  const [avatar, setAvatar] = useState<Avatar>({ body: BODY[0], skin: SKIN[2], hair: HAIR[1] });
  const [teamKey, setTeamKey] = useState(me?.team || data.teams[0]?.key || '');
  const [workMode, setWorkMode] = useState<'office' | 'remote'>('remote');

  // first free desk: the newcomer desk if nobody has it, otherwise a free desk in the chosen team
  const taken = new Set(data.people.filter(p => p.id !== data.meId).map(p => p.desk));
  const deskKey =
    (me?.desk && !taken.has(me.desk) ? me.desk : null) ??
    data.layout.desks.find(d => !taken.has(d.id) && (d.id === 'mine' || d.team === teamKey))?.id ??
    null;

  const save = useMutation({
    mutationFn: () => api.updateMe(data.org.id, { avatar, teamKey, workMode, deskKey }),
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ['me'] }), qc.invalidateQueries({ queryKey: ['floor'] })]),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const team = data.teams.find(t => t.key === teamKey);
  return (
    <main className="screen">
      <form className="card wide" onSubmit={submit}>
        <p className="eyebrow">
          {data.org.name} · {data.floor.name}
        </p>
        <h1>Welcome, {me?.name.split(' ')[0] ?? 'there'}</h1>
        <p className="lede">Set yourself up. You can change any of this later.</p>

        <div className="onboard">
          <div className="preview" aria-hidden="true">
            <div className="fig-head" style={{ background: avatar.skin, borderTopColor: avatar.hair }} />
            <div className="fig-body" style={{ background: avatar.body }} />
          </div>
          <div className="stack">
            <Swatches
              label="Outfit"
              name="body"
              colors={BODY}
              value={avatar.body}
              onChange={body => setAvatar(a => ({ ...a, body }))}
            />
            <Swatches
              label="Skin"
              name="skin"
              colors={SKIN}
              value={avatar.skin}
              onChange={skin => setAvatar(a => ({ ...a, skin }))}
            />
            <Swatches
              label="Hair"
              name="hair"
              colors={HAIR}
              value={avatar.hair}
              onChange={hair => setAvatar(a => ({ ...a, hair }))}
            />
          </div>
        </div>

        <fieldset className="choices">
          <legend>Your team</legend>
          {data.teams.map(t => (
            <label key={t.key} className="choice">
              <input
                type="radio"
                name="team"
                value={t.key}
                checked={teamKey === t.key}
                onChange={() => setTeamKey(t.key)}
              />
              {t.name}
            </label>
          ))}
        </fieldset>

        <fieldset className="choices">
          <legend>Where do you usually work?</legend>
          <label className="choice">
            <input type="radio" name="mode" checked={workMode === 'remote'} onChange={() => setWorkMode('remote')} />
            From home
          </label>
          <label className="choice">
            <input type="radio" name="mode" checked={workMode === 'office'} onChange={() => setWorkMode('office')} />
            At the office
          </label>
        </fieldset>

        <p className="hint">
          {deskKey
            ? `Your desk: ${deskKey === 'mine' ? 'the window desk by the Design pod' : `a desk in ${team?.name ?? 'your team'}'s area`}.`
            : 'No free desk right now. An admin can assign you one.'}
        </p>

        {save.isError && (
          <p className="error" role="alert">
            {save.error.message}
          </p>
        )}
        <button className="btn wide" type="submit" disabled={save.isPending || !teamKey}>
          {save.isPending ? 'Saving…' : 'Walk in'}
        </button>
      </form>
    </main>
  );
}
