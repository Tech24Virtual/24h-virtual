import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Single source of truth for resolving the current user's white-label partner_id.
 * RLS on white_label_partners restricts the row to user_id = auth.uid().
 * Admin users may not own a partner row; in that case partnerId is null and the
 * caller should fall back accordingly (admin bypass policies cover data reads).
 */
export function useWLPartnerId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wl-partner-id', user?.id],
    enabled: !!user?.id,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_partners')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.id ?? null;
    },
  });
}
