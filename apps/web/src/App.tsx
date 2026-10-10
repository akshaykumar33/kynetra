import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { Onboarding } from './screens/Onboarding';
import { Notice, SignIn } from './screens/SignIn';
import { useOffice } from './state';

// The 3D scene is the heavy part of the app; sign-in and onboarding load without it.
const OfficeScene = lazy(() => import('./world/Office').then(m => ({ default: m.OfficeScene })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // never retry a 401/403/404: those are answers, not glitches
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Gate />
    </QueryClientProvider>
  );
}

/** Takes an ?invite= token from the URL once, accepts it after sign-in, and cleans the URL. */
function useInvite(signedIn: boolean) {
  const qc = useQueryClient();
  const [token] = useState(() => new URLSearchParams(location.search).get('invite'));
  const accept = useMutation({
    mutationFn: (t: string) => api.acceptInvite(t),
    onSettled: () => {
      history.replaceState(null, '', location.pathname);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const { mutate, isIdle } = accept;
  useEffect(() => {
    if (signedIn && token && isIdle) mutate(token);
  }, [signedIn, token, isIdle, mutate]);
  return accept;
}

function Gate() {
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const signedIn = me.isSuccess;
  const invite = useInvite(signedIn);

  if (me.isPending) return <Notice title="Opening your office…" />;
  if (me.error instanceof ApiError && me.error.status === 401) return <SignIn />;
  if (me.isError) return <Notice title="Can't reach the office" body={me.error.message} retry={() => me.refetch()} />;
  if (invite.isPending) return <Notice title="Joining the office…" />;

  const org = me.data.orgs[0];
  if (!org)
    return (
      <Notice
        title="You're not in an office yet"
        body={
          invite.isError
            ? invite.error.message
            : 'Ask an admin at your company for an invite link, then open it while signed in.'
        }
        signOut
      />
    );
  return <OrgHome orgId={org.id} onboarded={org.onboarded} />;
}

function OrgHome({ orgId, onboarded }: { orgId: string; onboarded: boolean }) {
  const floor = useQuery({ queryKey: ['floor', orgId], queryFn: () => api.floor(orgId) });
  const loadFloor = useOffice(s => s.loadFloor);
  const peopleVersion = useOffice(s => s.peopleVersion);
  const { refetch } = floor;
  // someone new walked in (e.g. just accepted an invite): fetch their name and look
  useEffect(() => {
    if (peopleVersion > 0) refetch();
  }, [peopleVersion, refetch]);
  useEffect(() => {
    if (floor.data) loadFloor(floor.data);
  }, [floor.data, loadFloor]);

  if (floor.isPending) return <Notice title="Opening your office…" />;
  if (floor.isError)
    return <Notice title="Can't open the office" body={floor.error.message} retry={() => floor.refetch()} signOut />;
  if (!onboarded) return <Onboarding data={floor.data} />;
  return (
    <Suspense fallback={<Notice title="Setting up the floor…" />}>
      <OfficeScene />
    </Suspense>
  );
}
