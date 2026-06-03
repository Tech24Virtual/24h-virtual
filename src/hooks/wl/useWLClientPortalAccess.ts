import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';

export interface WLClientPortalAccess {
  id: string;
  partner_id: string;
  handoff_id: string;
  proposal_id: string;
  recipient_email: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  acknowledged_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function useWLClientPortalAccess(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['wl-client-portal-access', handoffId],
    enabled: !!handoffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_client_portal_access')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WLClientPortalAccess[];
    },
  });
}

/**
 * UX-clarity helper: returns whether the current user is allowed to manage
 * client portal links for the given partner. Server-side RLS is the real
 * security boundary; this just lets the UI disable buttons cleanly when the
 * user obviously won't be able to perform writes.
 */
export function useWLCanManagePortalLinks(partnerId: string | undefined): boolean {
  const { data: callerPartnerId, isLoading } = useWLPartnerId();
  const { isAdmin } = useAuth();
  if (isAdmin) return true;
  if (isLoading) return false;
  if (!callerPartnerId || !partnerId) return false;
  return callerPartnerId === partnerId;
}

async function generateToken(): Promise<{ token: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // URL-safe base64
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { token, hash };
}

interface CreateParams {
  partnerId: string;
  proposalId: string;
  handoffIdArg: string;
  recipientEmail?: string | null;
  expiresAt?: string | null;
}

export function useWLClientPortalAccessMutations(handoffId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wl-client-portal-access', handoffId] });
  };

  const insertAccess = async (params: CreateParams) => {
    const { token, hash } = await generateToken();
    const { data, error } = await supabase
      .from('wl_partner_client_portal_access')
      .insert({
        partner_id: params.partnerId,
        handoff_id: params.handoffIdArg,
        proposal_id: params.proposalId,
        token_hash: hash,
        recipient_email: params.recipientEmail?.trim() || null,
        expires_at: params.expiresAt ?? null,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return { access: data as unknown as WLClientPortalAccess, token };
  };

  const createAccess = useMutation({
    mutationFn: insertAccess,
    onSuccess: () => {
      invalidate();
      toast.success('Client link created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAccess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wl_partner_client_portal_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Link revoked');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const regenerateAccess = useMutation({
    mutationFn: async ({ oldId, ...params }: CreateParams & { oldId: string }) => {
      // Create new link first to avoid no-link window if revoke succeeds and create fails
      const created = await insertAccess(params);
      const { error: revokeErr } = await supabase
        .from('wl_partner_client_portal_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', oldId);
      if (revokeErr) throw revokeErr;
      return created;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Link regenerated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createAccess, revokeAccess, regenerateAccess };
}
