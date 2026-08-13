import { useAuth } from '@/contexts/AuthContext';

/**
 * Single source of truth for resolving the current user's white-label partner_id.
 * Reads directly from the already-loaded auth profile (profiles.wl_partner_id) —
 * no DB round-trip. Admin users may not own a partner row; in that case partnerId
 * is null and the caller should fall back accordingly (admin bypass policies cover
 * data reads).
 */
export function useWLPartnerId() {
  const { profile, loading, rolesLoaded } = useAuth();
  const isLoading = loading || !rolesLoaded;
  return {
    data: profile?.wl_partner_id ?? null,
    isLoading,
  };
}
