import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { resolveWLPartnerId } from '@/lib/wl/resolvePartner';

/**
 * Single source of truth for resolving the current user's white-label partner_id.
 * Uses the already-loaded auth profile (profiles.wl_partner_id) when set — no DB
 * round-trip. Otherwise falls back to partner ownership / active team membership
 * (wl_partner_members). Admin users may not belong to a partner; in that case
 * partnerId is null and the caller should fall back accordingly (admin bypass
 * policies cover data reads).
 */
export function useWLPartnerId() {
  const { user, profile, loading, rolesLoaded } = useAuth();
  const authLoading = loading || !rolesLoaded;
  const profilePartnerId = profile?.wl_partner_id ?? null;

  const fallback = useQuery({
    queryKey: ['wl-partner-id', user?.id],
    queryFn: () => resolveWLPartnerId(user!.id),
    enabled: !authLoading && !!user && !profilePartnerId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: profilePartnerId ?? fallback.data ?? null,
    isLoading: authLoading || (!profilePartnerId && !!user && fallback.isLoading),
  };
}
