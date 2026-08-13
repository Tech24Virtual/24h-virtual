import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';

export type WLTaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type WLTaskPriority = 'low' | 'medium' | 'high';
export type WLTaskType =
  | 'follow_up'
  | 'onboarding'
  | 'reminder'
  | 'approval'
  | 'review'
  | 'custom';
export type WLTaskSource =
  | 'proposal_accepted'
  | 'proposal_viewed'
  | 'proposal_declined'
  | 'proposal_past_due'
  | 'handoff_created'
  | 'manual';

export interface WLPartnerTask {
  id: string;
  partner_id: string;
  proposal_id: string | null;
  lead_id: string | null;
  handoff_id: string | null;
  title: string;
  description: string | null;
  task_type: WLTaskType;
  status: WLTaskStatus;
  priority: WLTaskPriority;
  source_event: WLTaskSource;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  proposal?: { id: string; title: string; proposal_number: string } | null;
  lead?: { id: string; name: string } | null;
}

export function useWLPartnerTasks() {
  const { data: partnerId, isLoading } = useWLPartnerId();

  return useQuery({
    queryKey: ['wl-partner-tasks', partnerId],
    enabled: !!partnerId && !isLoading,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_tasks')
        .select(
          '*, proposal:wl_partner_proposals(id, title, proposal_number), lead:wl_partner_leads(id, name)',
        )
        .eq('partner_id', partnerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WLPartnerTask[];
    },
  });
}

export interface WLTaskInput {
  title: string;
  description?: string | null;
  task_type?: WLTaskType;
  priority?: WLTaskPriority;
  due_at?: string | null;
  proposal_id?: string | null;
  lead_id?: string | null;
  handoff_id?: string | null;
}

export function useWLPartnerTaskMutations() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { data: partnerId } = useWLPartnerId();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wl-partner-tasks', partnerId] });
  };

  const createTask = useMutation({
    mutationFn: async (input: WLTaskInput) => {
      if (!partnerId && !isAdmin) throw new Error('No partner context');
      const { data, error } = await supabase
        .from('wl_partner_tasks')
        .insert({
          partner_id: partnerId!,
          created_by: user?.id ?? null,
          title: input.title.trim().slice(0, 200),
          description: input.description?.trim().slice(0, 5000) || null,
          task_type: input.task_type ?? 'custom',
          status: 'open',
          priority: input.priority ?? 'medium',
          source_event: 'manual',
          due_at: input.due_at ?? null,
          proposal_id: input.proposal_id ?? null,
          lead_id: input.lead_id ?? null,
          handoff_id: input.handoff_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WLPartnerTask;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Task created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: WLTaskStatus;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      if (status === 'open' || status === 'in_progress') updates.completed_at = null;
      const { data, error } = await supabase
        .from('wl_partner_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WLPartnerTask;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wl_partner_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Task deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Apply the same partial-update payload to many tasks in parallel.
   * Returns counts so the UI can surface partial-success states.
   */
  const bulkUpdate = useMutation({
    mutationFn: async ({
      ids,
      updates,
    }: {
      ids: string[];
      updates: { status?: WLTaskStatus; priority?: WLTaskPriority };
    }) => {
      if (ids.length === 0) {
        return { ok: 0, failed: 0, firstError: null as string | null };
      }
      const payload: Record<string, unknown> = {};
      if (updates.status) {
        payload.status = updates.status;
        if (updates.status === 'completed') {
          payload.completed_at = new Date().toISOString();
        } else if (updates.status === 'open' || updates.status === 'in_progress') {
          payload.completed_at = null;
        }
      }
      if (updates.priority) payload.priority = updates.priority;

      if (Object.keys(payload).length === 0) {
        return { ok: 0, failed: 0, firstError: null as string | null };
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase
            .from('wl_partner_tasks')
            .update(payload)
            .eq('id', id);
          return { id, error };
        }),
      );
      const failures = results.filter((r) => r.error);
      return {
        ok: results.length - failures.length,
        failed: failures.length,
        firstError: failures[0]?.error?.message ?? null,
      };
    },
    onSuccess: (result, vars) => {
      invalidate();
      if (result.failed === 0) {
        toast.success(`Updated ${result.ok} task${result.ok === 1 ? '' : 's'}`);
      } else if (result.ok === 0) {
        toast.error(`Failed to update tasks${result.firstError ? `: ${result.firstError}` : ''}`);
      } else {
        toast.warning(
          `Updated ${result.ok} of ${vars.ids.length} tasks${
            result.firstError ? ` — ${result.firstError}` : ''
          }`,
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createTask, setStatus, deleteTask, bulkUpdate };
}
