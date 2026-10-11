import { create } from 'zustand';

const KEY = 'kynetra.activeOrg';

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Which of your companies you are "in" right now. Remembered per browser for convenience only;
 * the server still checks membership on every request.
 */
export const useActiveOrg = create<{ orgId: string | null; setOrg: (id: string) => void }>(set => ({
  orgId: read(),
  setOrg: id => {
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // private mode or blocked storage: the choice just won't survive a reload
    }
    set({ orgId: id });
  },
}));
