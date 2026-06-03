import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { IntakeStatus, IntakePriority } from '@/lib/wl/fulfillmentStatus';

export interface FulfillmentIntake {
  id: string;
  partner_id: string;
  source_handoff_id: string;
  proposal_id: string;
  lead_id: string | null;
  intake_number: string;
  status: IntakeStatus;
  priority: IntakePriority;
  submitted_by: string | null;
  submitted_at: string;
  received_at: string | null;
  approved_at: string | null;
  activated_at: string | null;
  closed_at: string | null;
  assigned_to: string | null;
  snapshot_json: Record<string, unknown>;
  snapshot_version: number;
  created_at: string;
  updated_at: string;
  partner?: { id: string; company_name: string | null } | null;
}

export function useFulfillmentIntakes() {
  return useQuery({
    queryKey: ['admin-fulfillment-intakes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_fulfillment_intakes')
        .select('*, partner:white_label_partners(id, company_name)')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FulfillmentIntake[];
    },
  });
}

export function useFulfillmentIntake(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-fulfillment-intake', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_fulfillment_intakes')
        .select('*, partner:white_label_partners(id, company_name)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FulfillmentIntake | null;
    },
  });
}

export interface IntakeNote {
  id: string;
  intake_id: string;
  author_user_id: string | null;
  note_type: 'general' | 'decision' | 'blocker' | 'qa';
  body: string;
  created_at: string;
}

export function useIntakeNotes(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['admin-intake-notes', intakeId],
    enabled: !!intakeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_fulfillment_notes')
        .select('*')
        .eq('intake_id', intakeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IntakeNote[];
    },
  });
}

export interface IntakeActivity {
  id: string;
  intake_id: string;
  partner_id: string;
  event_type: string;
  actor_type: 'internal' | 'partner' | 'system';
  actor_user_id: string | null;
  meta_json: Record<string, unknown>;
  created_at: string;
}

export function useIntakeActivity(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['admin-intake-activity', intakeId],
    enabled: !!intakeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_fulfillment_activity')
        .select('*')
        .eq('intake_id', intakeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IntakeActivity[];
    },
  });
}

export interface IntakeDocument {
  id: string;
  intake_id: string;
  partner_id: string;
  source_document_id: string | null;
  document_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export function useIntakeDocuments(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['admin-intake-documents', intakeId],
    enabled: !!intakeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_fulfillment_intake_documents')
        .select('*')
        .eq('intake_id', intakeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IntakeDocument[];
    },
  });
}

export function useFulfillmentIntakeMutations() {
  const queryClient = useQueryClient();

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-fulfillment-intakes'] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['admin-fulfillment-intake', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-intake-activity', id] });
    }
  };

  const updateStatus = useMutation({
    mutationFn: async (input: { id: string; status: IntakeStatus }) => {
      const patch: Record<string, unknown> = { status: input.status };
      const now = new Date().toISOString();
      if (input.status === 'received') patch.received_at = now;
      if (input.status === 'approved') patch.approved_at = now;
      if (input.status === 'activated') patch.activated_at = now;
      if (input.status === 'closed') patch.closed_at = now;

      const { data: cur } = await supabase
        .from('internal_fulfillment_intakes')
        .select('status, partner_id')
        .eq('id', input.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from('internal_fulfillment_intakes')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;

      const { data: user } = await supabase.auth.getUser();
      await supabase.from('internal_fulfillment_activity').insert({
        intake_id: input.id,
        partner_id: (data as { partner_id: string }).partner_id,
        event_type: 'status_changed',
        actor_type: 'internal',
        actor_user_id: user.user?.id ?? null,
        meta_json: { from: cur?.status, to: input.status },
      });

      // Sync partner-side status
      await supabase.rpc('sync_partner_status_from_intake', {
        p_intake_id: input.id,
        p_new_intake_status: input.status,
      });

      // Activation side effects (direct client intakes only — identified by lead_id or client_lead_id)
      const leadId = (data as any).lead_id ?? (data as any).client_lead_id;
      if (input.status === 'activated' && leadId) {
        const partnerId = (data as any).partner_id as string | null;

        // 1. Fetch client email + name from leads table
        const { data: lead } = await supabase
          .from('leads')
          .select('email, name')
          .eq('id', leadId)
          .maybeSingle();

        if (lead?.email) {
          await supabase.functions.invoke('send-client-welcome-email', {
            body: {
              recipientEmail: lead.email,
              recipientName: lead.name ?? 'there',
              partnerId: partnerId ?? null,
              ctaUrl: `${window.location.origin}/client-dashboard`,
              ctaLabel: 'Access Your Dashboard',
              intro: 'Your account has been activated. You can now access your client dashboard.',
              preview: 'Your 24H Virtual account is ready.',
            },
          });
        }

        // 2. Update linked client_onboarding_handoff status to 'activated'
        const { data: handoffRow } = await supabase
          .from('client_onboarding_handoffs')
          .select('id')
          .eq('current_intake_id', input.id)
          .maybeSingle();

        if (handoffRow?.id) {
          await supabase
            .from('client_onboarding_handoffs')
            .update({ status: 'activated' })
            .eq('id', handoffRow.id);
        }
      }

      return data as unknown as FulfillmentIntake;
    },
    onSuccess: (data) => invalidate(data.id),
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePriority = useMutation({
    mutationFn: async (input: { id: string; priority: IntakePriority }) => {
      const { error } = await supabase
        .from('internal_fulfillment_intakes')
        .update({ priority: input.priority })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
    onError: (e: Error) => toast.error(e.message),
  });

  const assignOwner = useMutation({
    mutationFn: async (input: { id: string; assigned_to: string | null }) => {
      const { error } = await supabase
        .from('internal_fulfillment_intakes')
        .update({ assigned_to: input.assigned_to })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async (input: {
      intakeId: string;
      body: string;
      noteType?: 'general' | 'decision' | 'blocker' | 'qa';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('internal_fulfillment_notes').insert({
        intake_id: input.intakeId,
        author_user_id: user.user?.id ?? null,
        note_type: input.noteType ?? 'general',
        body: input.body.slice(0, 5000),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-intake-notes', vars.intakeId] });
      toast.success('Note added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestMoreInfo = useMutation({
    mutationFn: async (input: {
      intakeId: string;
      partnerId: string;
      handoffId: string;
      request_type: 'missing_item' | 'missing_document' | 'clarification' | 'correction';
      title: string;
      message?: string;
      target_item_key?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('wl_partner_handoff_requests').insert({
        partner_id: input.partnerId,
        handoff_id: input.handoffId,
        intake_id: input.intakeId,
        request_type: input.request_type,
        title: input.title.slice(0, 200),
        message: input.message?.slice(0, 2000) ?? null,
        target_item_key: input.target_item_key ?? null,
        requested_by: user.user?.id ?? null,
      });
      if (error) throw error;

      await supabase.from('internal_fulfillment_activity').insert({
        intake_id: input.intakeId,
        partner_id: input.partnerId,
        event_type: 'info_requested',
        actor_type: 'internal',
        actor_user_id: user.user?.id ?? null,
        meta_json: { request_type: input.request_type, title: input.title },
      });

      // Flip both sides
      await supabase
        .from('internal_fulfillment_intakes')
        .update({ status: 'needs_partner_update' })
        .eq('id', input.intakeId);
      await supabase.rpc('sync_partner_status_from_intake', {
        p_intake_id: input.intakeId,
        p_new_intake_status: 'needs_partner_update',
      });
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.intakeId);
      toast.success('Request sent to partner');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('wl-fulfillment-documents')
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return { updateStatus, updatePriority, assignOwner, addNote, requestMoreInfo, getSignedUrl };
}
