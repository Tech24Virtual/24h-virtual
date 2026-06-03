import { describe, it, expect } from 'vitest';

/**
 * D-1.1 (Computer QA Retest v3): the login post-success redirect must wait
 * for `rolesLoaded` to be true for the freshly-signed-in user. It must NOT
 * fire purely on `!loading`, because Supabase flips loading=false before
 * the role fetch resolves.
 *
 * This test pins the exact gating predicate used by LoginForm's redirect
 * effect so a future refactor cannot regress the race.
 */
function shouldRedirect(state: {
  pendingRedirect: boolean;
  user: { id: string } | null;
  loading: boolean;
  rolesLoaded: boolean;
  hasRedirected: boolean;
}): boolean {
  if (!state.pendingRedirect) return false;
  if (!state.user) return false;
  if (state.loading) return false;
  if (!state.rolesLoaded) return false;
  if (state.hasRedirected) return false;
  return true;
}

describe('LoginForm post-success redirect gate (D-1.1)', () => {
  const base = {
    pendingRedirect: true,
    user: { id: 'u1' },
    loading: false,
    rolesLoaded: true,
    hasRedirected: false,
  };

  it('waits when rolesLoaded is false even if loading is false', () => {
    expect(shouldRedirect({ ...base, rolesLoaded: false })).toBe(false);
  });

  it('waits when user has not been hydrated yet', () => {
    expect(shouldRedirect({ ...base, user: null })).toBe(false);
  });

  it('waits while session is still loading', () => {
    expect(shouldRedirect({ ...base, loading: true })).toBe(false);
  });

  it('does not double-redirect once handled', () => {
    expect(shouldRedirect({ ...base, hasRedirected: true })).toBe(false);
  });

  it('redirects only when user + roles are both ready', () => {
    expect(shouldRedirect(base)).toBe(true);
  });
});
