import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WLProposalShare {
  id: string;
  partner_id: string;
  proposal_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  created_at: string;
  // Raw token returned ONLY on creation, never persisted/refetched
  _raw_token?: string;
}

/**
 * Generate a cryptographically random URL-safe token (32 bytes → ~43 chars base64url).
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useWLProposalShares(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['wl-proposal-shares', proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_proposal_shares')
        .select(
          'id, partner_id, proposal_id, recipient_name, recipient_email, expires_at, revoked_at, last_viewed_at, view_count, created_at',
        )
        .eq('proposal_id', proposalId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WLProposalShare[];
    },
  });
}

export function useWLProposalShareMutations(proposalId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wl-proposal-shares', proposalId] });
  };

  const createShare = useMutation({
    mutationFn: async (params: {
      partner_id: string;
      recipient_name?: string | null;
      recipient_email?: string | null;
      expires_at?: string | null;
    }) => {
      if (!proposalId) throw new Error('Missing proposal');
      const rawToken = generateToken();
      const tokenHash = await sha256Hex(rawToken);

      const { data, error } = await supabase
        .from('wl_partner_proposal_shares')
        .insert({
          partner_id: params.partner_id,
          proposal_id: proposalId,
          token_hash: tokenHash,
          created_by: user?.id ?? null,
          recipient_name: params.recipient_name?.trim() || null,
          recipient_email: params.recipient_email?.trim() || null,
          expires_at: params.expires_at ?? null,
        })
        .select(
          'id, partner_id, proposal_id, recipient_name, recipient_email, expires_at, revoked_at, last_viewed_at, view_count, created_at',
        )
        .single();
      if (error) throw error;
      return { ...(data as WLProposalShare), _raw_token: rawToken };
    },
    onSuccess: () => {
      invalidate();
      toast.success('Share link created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('wl_partner_proposal_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Link revoked');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createShare, revokeShare };
}
