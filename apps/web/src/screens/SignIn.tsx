import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../api';

const PROVIDER_LABEL: Record<string, string> = { google: 'Google Workspace', microsoft: 'Microsoft' };

export function SignIn() {
  const qc = useQueryClient();
  const providers = useQuery({ queryKey: ['providers'], queryFn: api.providers });
  const [email, setEmail] = useState('');
  const devLogin = useMutation({
    mutationFn: (e: string) => api.devLogin(e),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    devLogin.mutate(email);
  };

  return (
    <main className="screen">
      <div className="card">
        <p className="eyebrow">Knovra Office</p>
        <h1>Come on in</h1>
        <p className="lede">Sign in with your work account to join your team's floor.</p>

        <div className="stack">
          {providers.data?.providers.map(p => (
            // a full-page navigation, not fetch: the provider takes over the window
            <a key={p} className="btn wide" href={`/auth/${p}/start`}>
              Continue with {PROVIDER_LABEL[p] ?? p}
            </a>
          ))}
          {providers.data && providers.data.providers.length === 0 && !providers.data.devLogin && (
            <p className="hint">Sign-in isn't set up on this server yet. Ask your admin.</p>
          )}
        </div>

        {providers.data?.devLogin && (
          <form className="dev" onSubmit={submit}>
            <p className="eyebrow">Development sign-in</p>
            <label htmlFor="dev-email">Work email</label>
            <div className="row">
              <input
                id="dev-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@northgate.test"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button className="btn" type="submit" disabled={devLogin.isPending}>
                {devLogin.isPending ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
            {devLogin.isError && (
              <p className="error" role="alert">
                {devLogin.error.message}
              </p>
            )}
            <p className="hint">Only on development servers. Try you@northgate.test or lena@northgate.test.</p>
          </form>
        )}
      </div>
    </main>
  );
}

interface NoticeProps {
  title: string;
  body?: string;
  retry?: () => void;
  signOut?: boolean;
}

/** A full-screen message for loading, empty and error states. */
export function Notice({ title, body, retry, signOut }: NoticeProps) {
  const qc = useQueryClient();
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => qc.resetQueries() });
  return (
    <main className="screen" aria-busy={!body && !retry}>
      <div className="card">
        <h1>{title}</h1>
        {body && <p className="lede">{body}</p>}
        {(retry || signOut) && (
          <div className="row">
            {retry && (
              <button className="btn" onClick={retry}>
                Try again
              </button>
            )}
            {signOut && (
              <button className="btn ghost" onClick={() => logout.mutate()}>
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
