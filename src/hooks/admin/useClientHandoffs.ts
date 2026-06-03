/**
 * Phase 7+ — Direct-client onboarding hooks (admin/supervisor surface).
 *
 * Mirrors the WL handoff hook shape so admin onboarding components can stay
 * structurally close to their WL counterparts. Reads / mutations rely on the
 * RLS policies introduced by the add_direct_client_onboarding_fulfillment
 * migration.
 *
 * Documents are filtered by handoff_id only — RLS scopes who can read each row
 * (admins/supervisors see all; clients see only their own uploads).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientHandoffStatus } from '@/lib/wl/fulfillmentLifecycle';

export interface ClientHandoffLeadSummary {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service_type: string | null;
}

export interface ClientHandoff {
  id: string;
  client_lead_id: string;
  client_user_id: string | null;
  status: ClientHandoffStatus;
  checklist_template: string;
  checklist_state: Record<string, unknown>;
  current_intake_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  lead?: ClientHandoffLeadSummary | null;
  open_request_count?: number;
  required_total?: number;
  required_completed?: number;
}

export interface ClientHandoffItem {
  id: string;
  handoff_id: string;
  item_key: string;
  label: string;
  item_type: 'boolean' | 'text' | 'long_text' | 'phone' | 'email' | 'date' | 'number';
  is_required: boolean;
  is_client_fillable: boolean;
  sort_order: number;
  status: 'pending' | 'provided' | 'na';
  value_json: { value?: unknown } | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientHandoffDocument {
  id: string;
  handoff_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ClientHandoffRequest {
  id: string;
  handoff_id: string;
  request_type: 'missing_item' | 'missing_document' | 'clarification' | 'correction';
  title: string;
  message: string;
  target_item_key: string | null;
  status: 'open' | 'resolved' | 'cancelled';
  requested_by: string | null;
  requested_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface ClientHandoffActivity {
  id: string;
  handoff_id: string;
  event_type: string;
  actor_id: string | null;
  actor_label: string | null;
  meta_json: Record<string, unknown>;
  created_at: string;
}

const HANDOFF_LIST_KEY = ['admin-client-handoffs'] as const;

export function useClientHandoffs() {
  return useQuery({
    queryKey: HANDOFF_LIST_KEY,
    queryFn: async (): Promise<ClientHandoff[]> => {
      const { data, error } = await supabase
        .from('client_onboarding_handoffs')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const handoffs = (data ?? []) as unknown as ClientHandoff[];
      if (handoffs.length === 0) return handoffs;

      const leadIds = Array.from(new Set(handoffs.map((h) => h.client_lead_id)));
      const handoffIds = handoffs.map((h) => h.id);

      const [leadsRes, requestsRes, itemsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, email, company, service_type')
          .in('id', leadIds),
        supabase
          .from('client_handoff_requests')
          .select('handoff_id, status')
          .in('handoff_id', handoffIds)
          .eq('status', 'open'),
        supabase
          .from('client_handoff_items')
          .select('handoff_id, is_required, status')
          .in('handoff_id', handoffIds),
      ]);

      const leadById = new Map<string, ClientHandoffLeadSummary>();
      for (const l of leadsRes.data ?? []) {
        leadById.set(l.id, l as ClientHandoffLeadSummary);
      }
      const openByHandoff = new Map<string, number>();
      for (const r of requestsRes.data ?? []) {
        openByHandoff.set(r.handoff_id, (openByHandoff.get(r.handoff_id) ?? 0) + 1);
      }
      const itemStatsByHandoff = new Map<string, { total: number; done: number }>();
      for (const it of itemsRes.data ?? []) {
        if (!it.is_required) continue;
        const cur = itemStatsByHandoff.get(it.handoff_id) ?? { total: 0, done: 0 };
        cur.total += 1;
        if (it.status === 'provided' || it.status === 'na') cur.done += 1;
        itemStatsByHandoff.set(it.handoff_id, cur);
      }

      return handoffs.map((h) => ({
        ...h,
        lead: leadById.get(h.client_lead_id) ?? null,
        open_request_count: openByHandoff.get(h.id) ?? 0,
        required_total: itemStatsByHandoff.get(h.id)?.total ?? 0,
        required_completed: itemStatsByHandoff.get(h.id)?.done ?? 0,
      }));
    },
  });
}

export function useClientHandoff(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-client-handoff', id],
    enabled: !!id,
    queryFn: async (): Promise<ClientHandoff | null> => {
      const { data, error } = await supabase
        .from('client_onboarding_handoffs')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const handoff = data as unknown as ClientHandoff;
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, email, company, service_type')
        .eq('id', handoff.client_lead_id)
        .maybeSingle();
      return { ...handoff, lead: (lead as ClientHandoffLeadSummary | null) ?? null };
    },
  });
}

export function useClientHandoffByLeadId(leadId: string | undefined) {
  return useQuery({
    queryKey: ['admin-client-handoff-by-lead', leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<ClientHandoff | null> => {
      const { data, error } = await supabase
        .from('client_onboarding_handoffs')
        .select('*')
        .eq('client_lead_id', leadId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ClientHandoff | null) ?? null;
    },
  });
}

export function useClientHandoffItems(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['admin-client-handoff-items', handoffId],
    enabled: !!handoffId,
    queryFn: async (): Promise<ClientHandoffItem[]> => {
      const { data, error } = await supabase
        .from('client_handoff_items')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ClientHandoffItem[];
    },
  });
}

export function useClientHandoffDocuments(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['admin-client-handoff-documents', handoffId],
    enabled: !!handoffId,
    queryFn: async (): Promise<ClientHandoffDocument[]> => {
      // Scoped strictly by handoff_id; RLS decides which rows the caller can read.
      const { data, error } = await supabase
        .from('client_handoff_documents')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientHandoffDocument[];
    },
  });
}

export function useClientHandoffRequests(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['admin-client-handoff-requests', handoffId],
    enabled: !!handoffId,
    queryFn: async (): Promise<ClientHandoffRequest[]> => {
      const { data, error } = await supabase
        .from('client_handoff_requests')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientHandoffRequest[];
    },
  });
}

export function useClientOnboardingActivity(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['admin-client-onboarding-activity', handoffId],
    enabled: !!handoffId,
    queryFn: async (): Promise<ClientHandoffActivity[]> => {
      const { data, error } = await supabase
        .from('client_onboarding_activity')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientHandoffActivity[];
    },
  });
}

export function useClientHandoffMutations(handoffId: string) {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: HANDOFF_LIST_KEY });
    qc.invalidateQueries({ queryKey: ['admin-client-handoff', handoffId] });
    qc.invalidateQueries({ queryKey: ['admin-client-handoff-items', handoffId] });
    qc.invalidateQueries({ queryKey: ['admin-client-handoff-documents', handoffId] });
    qc.invalidateQueries({ queryKey: ['admin-client-handoff-requests', handoffId] });
    qc.invalidateQueries({ queryKey: ['admin-client-onboarding-activity', handoffId] });
  };

  const logActivity = async (event_type: string, meta: Record<string, unknown> = {}) => {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from('client_onboarding_activity').insert([{
      handoff_id: handoffId,
      event_type,
      actor_id: user.user?.id ?? null,
      actor_label: 'admin',
      meta_json: meta as never,
    }]);
  };

  const updateHandoffStatus = useMutation({
    mutationFn: async (status: ClientHandoffStatus) => {
      const { error } = await supabase
        .from('client_onboarding_handoffs')
        .update({ status })
        .eq('id', handoffId);
      if (error) throw error;
      await logActivity('handoff_status_changed', { to: status });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateChecklistState = useMutation({
    mutationFn: async (checklist_state: Record<string, unknown>) => {
      const { error } = await supabase
        .from('client_onboarding_handoffs')
        .update({ checklist_state: checklist_state as never })
        .eq('id', handoffId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async (input: {
      id: string;
      value?: unknown;
      status?: 'pending' | 'provided' | 'na';
      notes?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.value !== undefined) patch.value_json = { value: input.value };
      if (input.status !== undefined) patch.status = input.status;
      if (input.notes !== undefined) patch.notes = input.notes;
      const { error } = await supabase
        .from('client_handoff_items')
        .update(patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-client-handoff-items', handoffId] });
      qc.invalidateQueries({ queryKey: HANDOFF_LIST_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markItemNa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_handoff_items')
        .update({ status: 'na' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-client-handoff-items', handoffId] });
      qc.invalidateQueries({ queryKey: HANDOFF_LIST_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadDocument = useMutation({
    mutationFn: async (input: { file: File; document_type: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      const path = `direct/${handoffId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('wl-fulfillment-documents')
        .upload(path, input.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: input.file.type || 'application/octet-stream',
        });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('client_handoff_documents').insert({
        handoff_id: handoffId,
        document_type: input.document_type || 'other',
        file_path: path,
        file_name: input.file.name.slice(0, 200),
        file_size: input.file.size,
        mime_type: input.file.type || null,
        status: 'active',
        uploaded_by: user.user.id,
      });
      if (insErr) throw insErr;
      await logActivity('document_uploaded', {
        document_type: input.document_type,
        file_name: input.file.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-client-handoff-documents', handoffId] });
      qc.invalidateQueries({ queryKey: ['admin-client-onboarding-activity', handoffId] });
      toast.success('Document uploaded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDocument = useMutation({
    mutationFn: async (doc: ClientHandoffDocument) => {
      const { error } = await supabase
        .from('client_handoff_documents')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
      await supabase.storage.from('wl-fulfillment-documents').remove([doc.file_path]);
      await logActivity('document_removed', { file_name: doc.file_name });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-client-handoff-documents', handoffId] });
      qc.invalidateQueries({ queryKey: ['admin-client-onboarding-activity', handoffId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRequest = useMutation({
    mutationFn: async (input: {
      request_type: ClientHandoffRequest['request_type'];
      title: string;
      message: string;
      target_item_key?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('client_handoff_requests').insert({
        handoff_id: handoffId,
        request_type: input.request_type,
        title: input.title.slice(0, 200),
        message: input.message.slice(0, 2000),
        target_item_key: input.target_item_key ?? null,
        status: 'open',
        requested_by: user.user?.id ?? null,
      });
      if (error) throw error;
      await logActivity('info_requested', {
        request_type: input.request_type,
        title: input.title,
      });
      // Flip handoff into needs_more_info to surface the open-request banner.
      await supabase
        .from('client_onboarding_handoffs')
        .update({ status: 'needs_more_info' })
        .eq('id', handoffId);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Request sent to client');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRequestResolved = useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('client_handoff_requests')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.user?.id ?? null,
        })
        .eq('id', id);
      if (error) throw error;
      await logActivity('request_resolved', { request_id: id });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Request resolved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    updateHandoffStatus,
    updateChecklistState,
    updateItem,
    markItemNa,
    uploadDocument,
    removeDocument,
    createRequest,
    markRequestResolved,
  };
}
