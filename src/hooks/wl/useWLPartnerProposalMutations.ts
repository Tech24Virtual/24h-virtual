import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';
import {
  canEditField,
  canTransition,
  type WLProposalStatus,
} from './wlProposalTransitions';
import type { WLPartnerProposal } from './useWLPartnerProposals';

export interface WLProposalInput {
  title: string;
  lead_id?: string | null;
  offering_name?: string | null;
  scope_summary?: string | null;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  valid_until?: string | null;
}

const TIMESTAMP_FIELD: Record<WLProposalStatus, string | null> = {
  draft: null,
  sent: 'sent_at',
  viewed: 'viewed_at',
  accepted: 'accepted_at',
  declined: 'declined_at',
  expired: null,
};

export function useWLPartnerProposalMutations() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { data: partnerId } = useWLPartnerId();

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['wl-partner-proposals', partnerId] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['wl-partner-proposal', id] });
      queryClient.invalidateQueries({ queryKey: ['wl-proposal-activity', id] });
    }
  };

  const createProposal = useMutation({
    mutationFn: async (input: WLProposalInput) => {
      if (!partnerId && !isAdmin) throw new Error('No partner context');
      const payload = {
        partner_id: partnerId!,
        created_by: user?.id ?? null,
        title: input.title,
        lead_id: input.lead_id ?? null,
        offering_name: input.offering_name?.trim() || null,
        scope_summary: input.scope_summary?.trim() || null,
        amount: input.amount ?? null,
        currency: input.currency?.trim() || null,
        notes: input.notes?.trim() || null,
        valid_until: input.valid_until ?? null,
        status: 'draft' as WLProposalStatus,
      };
      const { data, error } = await supabase
        .from('wl_partner_proposals')
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WLPartnerProposal;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Proposal created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProposal = useMutation({
    mutationFn: async ({
      id,
      currentStatus,
      updates,
    }: {
      id: string;
      currentStatus: WLProposalStatus;
      updates: Partial<WLProposalInput>;
    }) => {
      // Client-side editability guard (RLS still enforces tenant safety server-side)
      for (const field of Object.keys(updates)) {
        if (!canEditField(currentStatus, field, isAdmin)) {
          throw new Error(
            `Field "${field}" cannot be edited while proposal is ${currentStatus}`,
          );
        }
      }
      const cleaned: Record<string, unknown> = {};
      if ('title' in updates) cleaned.title = updates.title;
      if ('lead_id' in updates) cleaned.lead_id = updates.lead_id ?? null;
      if ('offering_name' in updates)
        cleaned.offering_name = updates.offering_name?.trim() || null;
      if ('scope_summary' in updates)
        cleaned.scope_summary = updates.scope_summary?.trim() || null;
      if ('amount' in updates) cleaned.amount = updates.amount ?? null;
      if ('currency' in updates)
        cleaned.currency = updates.currency?.trim() || null;
      if ('notes' in updates) cleaned.notes = updates.notes?.trim() || null;
      if ('valid_until' in updates) cleaned.valid_until = updates.valid_until ?? null;

      const { data, error } = await supabase
        .from('wl_partner_proposals')
        .update(cleaned)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WLPartnerProposal;
    },
    onSuccess: (data) => {
      invalidate(data.id);
      toast.success('Proposal updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      from,
      to,
      recipient_name,
      recipient_email,
    }: {
      id: string;
      from: WLProposalStatus;
      to: WLProposalStatus;
      recipient_name?: string | null;
      recipient_email?: string | null;
    }) => {
      if (!canTransition(from, to, isAdmin)) {
        throw new Error(`Cannot move proposal from ${from} to ${to}`);
      }
      const updates: Record<string, unknown> = { status: to };
      const ts = TIMESTAMP_FIELD[to];
      if (ts) updates[ts] = new Date().toISOString();
      // Re-send from expired resets sent_at
      if (from === 'expired' && to === 'sent') {
        updates.sent_at = new Date().toISOString();
      }
      // When marking as sent, optionally capture recipient context
      if (to === 'sent') {
        if (recipient_name !== undefined) {
          updates.last_recipient_name = recipient_name?.trim() || null;
        }
        if (recipient_email !== undefined) {
          updates.last_recipient_email = recipient_email?.trim() || null;
        }
      }
      const { data, error } = await supabase
        .from('wl_partner_proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Best-effort activity log row for marked_sent
      if (to === 'sent' && partnerId) {
        const meta: Record<string, unknown> = {};
        if (recipient_name) meta.recipient_name = recipient_name;
        if (recipient_email) meta.recipient_email = recipient_email;
        try {
          await supabase.from('wl_partner_proposal_activity').insert({
            partner_id: (data as WLPartnerProposal).partner_id,
            proposal_id: id,
            event_type: 'marked_sent',
            actor_user_id: user?.id ?? null,
            metadata: meta as never,
          });
        } catch (e) {
          console.warn('marked_sent activity insert failed:', e);
        }
      }

      return data as WLPartnerProposal;
    },
    onSuccess: (data) => {
      invalidate(data.id);
      toast.success(`Marked as ${data.status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRecipient = useMutation({
    mutationFn: async ({
      id,
      recipient_name,
      recipient_email,
    }: {
      id: string;
      recipient_name: string | null;
      recipient_email: string | null;
    }) => {
      const { data, error } = await supabase
        .from('wl_partner_proposals')
        .update({
          last_recipient_name: recipient_name?.trim() || null,
          last_recipient_email: recipient_email?.trim() || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (partnerId) {
        try {
          await supabase.from('wl_partner_proposal_activity').insert({
            partner_id: (data as WLPartnerProposal).partner_id,
            proposal_id: id,
            event_type: 'recipient_updated',
            actor_user_id: user?.id ?? null,
            metadata: {
              recipient_name: recipient_name ?? null,
              recipient_email: recipient_email ?? null,
            } as never,
          });
        } catch (e) {
          console.warn('recipient_updated activity insert failed:', e);
        }
      }

      return data as WLPartnerProposal;
    },
    onSuccess: (data) => {
      invalidate(data.id);
      toast.success('Recipient updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wl_partner_proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Proposal deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    createProposal,
    updateProposal,
    updateStatus,
    updateRecipient,
    deleteProposal,
  };
}
