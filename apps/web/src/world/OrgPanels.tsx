import { FoundOrgSchema, MAX_OWNED_ORGS, TEAM_ZONES } from '@kynetra/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { orgApi } from '../api';
import { useActiveOrg } from '../activeOrg';

/**
 * Found a company in two steps: name it and its teams, then pick a free floor in a tower (from the
 * list, or by clicking a tower in the world). The floor and the company are created together.
 */
export function FoundPanel({
  towerId,
  onPickTower,
  onClose,
}: {
  /** The tower selected in the 3D world, if any. */
  towerId: string | null;
  onPickTower: (id: string) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const setOrg = useActiveOrg(s => s.setOrg);
  const [step, setStep] = useState<'name' | 'floor'>('name');
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<string[]>(['']);
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vacancies = useQuery({ queryKey: ['vacancies'], queryFn: orgApi.vacancies, enabled: step === 'floor' });
  const tower = vacancies.data?.buildings.find(b => b.id === towerId) ?? null;

  const found = useMutation({
    mutationFn: orgApi.found,
    onSuccess: ({ orgId }) => {
      setOrg(orgId);
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['world'] });
      qc.invalidateQueries({ queryKey: ['vacancies'] });
    },
    onError: () => qc.invalidateQueries({ queryKey: ['vacancies'] }),
  });

  const toFloor = (e: FormEvent) => {
    e.preventDefault();
    const check = FoundOrgSchema.safeParse({
      name,
      teams: teams.map(t => t.trim()).filter(Boolean),
      buildingId: '00000000-0000-4000-8000-000000000000',
      level: 1,
    });
    if (!check.success) return setError(check.error.issues[0]?.message ?? 'Check the details');
    setError(null);
    setStep('floor');
  };

  const submit = () => {
    if (!tower || level === null) return;
    found.mutate({ name: name.trim(), buildingId: tower.id, level, teams: teams.map(t => t.trim()).filter(Boolean) });
  };

  return (
    <section className="panel found" aria-label="Found a company">
      <p className="eyebrow">Found a company · step {step === 'name' ? 1 : 2} of 2</p>
      {step === 'name' ? (
        <form onSubmit={toFloor}>
          <label className="field">
            <span>Company name</span>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40} autoFocus />
          </label>
          <fieldset>
            <legend>Teams (up to {TEAM_ZONES.length}, each gets its own area of the floor)</legend>
            {teams.map((t, i) => (
              <div className="field-row" key={i}>
                <label className="sr-only" htmlFor={`team-${i}`}>
                  Team {i + 1}
                </label>
                <input
                  id={`team-${i}`}
                  // a team field added with "+ Add a team" takes the cursor, so you can just type
                  autoFocus={i > 0}
                  value={t}
                  maxLength={30}
                  placeholder={['Engineering', 'Design', 'Sales'][i]}
                  onChange={e => setTeams(teams.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {teams.length > 1 && (
                  <button
                    type="button"
                    className="link"
                    aria-label={`Remove team ${i + 1}`}
                    onClick={() => setTeams(teams.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {teams.length < TEAM_ZONES.length && (
              <button type="button" className="link" onClick={() => setTeams([...teams, ''])}>
                + Add a team
              </button>
            )}
          </fieldset>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn">Choose a floor</button>
          </div>
        </form>
      ) : (
        <div>
          <p className="hint">Pick a tower (here or in the world), then a free floor.</p>
          {vacancies.isPending && <p className="hint">Checking which floors are free…</p>}
          {vacancies.isError && <p className="error">{vacancies.error.message}</p>}
          <div className="chips" role="group" aria-label="Towers">
            {vacancies.data?.buildings.map(b => (
              <button
                key={b.id}
                aria-pressed={b.id === towerId}
                disabled={b.vacant.length === 0}
                onClick={() => {
                  onPickTower(b.id);
                  setLevel(null);
                }}
              >
                {b.name} · {b.vacant.length} free
              </button>
            ))}
          </div>
          {tower && (
            <fieldset>
              <legend>Free floors in {tower.name}</legend>
              <div className="chips floors" role="group" aria-label={`Free floors in ${tower.name}`}>
                {tower.vacant.map(l => (
                  <button key={l} aria-pressed={l === level} onClick={() => setLevel(l)} aria-label={`Floor ${l}`}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {found.isError && (
            <p className="error" role="alert">
              {found.error.message}
            </p>
          )}
          <div className="row">
            <button className="btn ghost" onClick={() => setStep('name')}>
              Back
            </button>
            <button className="btn" disabled={!tower || level === null || found.isPending} onClick={submit}>
              {found.isPending
                ? 'Signing the lease…'
                : tower && level
                  ? `Found ${name.trim()} on floor ${level}`
                  : 'Pick a floor'}
            </button>
          </div>
          <p className="hint">You'll be its owner. You can found up to {MAX_OWNED_ORGS} companies.</p>
        </div>
      )}
    </section>
  );
}

/** Run a company: teams (each with its own area of the floor) and invite links. */
export function ManagePanel({ orgId, orgName, onClose }: { orgId: string; orgName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const manage = useQuery({ queryKey: ['manage', orgId], queryFn: () => orgApi.manage(orgId) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['manage', orgId] });
    qc.invalidateQueries({ queryKey: ['floor', orgId] });
    qc.invalidateQueries({ queryKey: ['world'] });
  };
  const [newTeam, setNewTeam] = useState('');
  const add = useMutation({
    mutationFn: (n: string) => orgApi.addTeam(orgId, n),
    onSuccess: () => {
      setNewTeam('');
      refresh();
    },
  });
  const rename = useMutation({
    mutationFn: ({ key, name }: { key: string; name: string }) => orgApi.renameTeam(orgId, key, name),
    onSettled: refresh,
  });

  return (
    <section className="panel found" aria-label={`Manage ${orgName}`}>
      <p className="eyebrow">Manage</p>
      <h2>{orgName}</h2>
      {manage.isPending && <p className="hint">Loading…</p>}
      {manage.isError && <p className="error">{manage.error.message}</p>}
      {manage.data && (
        <>
          <p className="hint">
            {manage.data.people} {manage.data.people === 1 ? 'person' : 'people'} · you're{' '}
            {manage.data.role === 'owner' ? 'the owner' : 'an admin'}
          </p>
          <fieldset>
            <legend>Teams</legend>
            <ul className="team-list">
              {manage.data.teams.map(t => (
                <TeamRow key={t.key} team={t} onRename={name => rename.mutate({ key: t.key, name })} />
              ))}
            </ul>
            {rename.isError && <p className="error">{rename.error.message}</p>}
            {manage.data.roomForTeams ? (
              <form
                className="field-row"
                onSubmit={e => {
                  e.preventDefault();
                  if (newTeam.trim()) add.mutate(newTeam.trim());
                }}
              >
                <label className="sr-only" htmlFor="new-team">
                  New team
                </label>
                <input
                  id="new-team"
                  placeholder="New team"
                  maxLength={30}
                  value={newTeam}
                  onChange={e => setNewTeam(e.target.value)}
                />
                <button className="btn" disabled={add.isPending}>
                  Add
                </button>
              </form>
            ) : (
              <p className="hint">Your floor has an area for each of its three teams; all are taken.</p>
            )}
            {add.isError && <p className="error">{add.error.message}</p>}
          </fieldset>
          <InviteForm orgId={orgId} />
        </>
      )}
      <button className="btn ghost" onClick={onClose}>
        Done
      </button>
    </section>
  );
}

function TeamRow({
  team,
  onRename,
}: {
  team: { key: string; name: string; people: number };
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(team.name);
  const changed = name.trim() && name.trim() !== team.name;
  return (
    <li>
      <form
        className="field-row"
        onSubmit={e => {
          e.preventDefault();
          if (changed) onRename(name.trim());
        }}
      >
        <label className="sr-only" htmlFor={`team-${team.key}`}>
          Team name
        </label>
        <input id={`team-${team.key}`} value={name} maxLength={30} onChange={e => setName(e.target.value)} />
        <small>{team.people} in</small>
        {changed && <button className="btn">Rename</button>}
      </form>
    </li>
  );
}

function InviteForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'guest'>('member');
  const invite = useMutation({ mutationFn: () => orgApi.invite(orgId, email.trim(), role) });
  return (
    <fieldset>
      <legend>Invite someone</legend>
      <form
        className="field-row"
        onSubmit={e => {
          e.preventDefault();
          if (email.trim()) invite.mutate();
        }}
      >
        <label className="sr-only" htmlFor="invite-email">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <label className="sr-only" htmlFor="invite-role">
          Role
        </label>
        <select id="invite-role" value={role} onChange={e => setRole(e.target.value as typeof role)}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="guest">Guest</option>
        </select>
        <button className="btn" disabled={invite.isPending}>
          Create link
        </button>
      </form>
      {invite.isError && <p className="error">{invite.error.message}</p>}
      {invite.data && (
        <div className="invite-link">
          <p className="hint">
            Send this link to {email}. It works once, for that email, for a limited time, and is only shown now.
          </p>
          <input readOnly value={invite.data.link} onFocus={e => e.target.select()} aria-label="Invite link" />
        </div>
      )}
    </fieldset>
  );
}
