/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AssignedModuleRow {
  id: string;
  module_id: string;
  agent_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  trigger_type: string;
  module: {
    id: string;
    title: string;
    summary: string | null;
    required: boolean;
    campaign_id: string | null;
    body_md: string | null;
    status: string;
    campaign: { id: string; display_name: string } | null;
  } | null;
}

export interface SignoffWithExpiry {
  id: string;
  completion_id: string;
  module_id: string;
  campaign_id: string | null;
  agent_id: string;
  signed_off_at: string;
  expires_at: string | null;
  needs_refresh: boolean;
  refresh_reason: string | null;
  signoff_note: string | null;
}

export function useMyAssignedModules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training', 'my-assignments', user?.id],
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30_000,
    queryFn: async (): Promise<AssignedModuleRow[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_assignments')
        .select(`
          id, module_id, agent_id, assigned_by, assigned_at, due_date, trigger_type,
          module:campaign_training_modules(
            id, title, summary, required, campaign_id, body_md, status,
            campaign:campaigns(id, display_name)
          )
        `)
        .eq('agent_id', user!.id)
        .order('assigned_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AssignedModuleRow[];
    },
  });
}

export function useMySignoffsWithExpiry() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training', 'my-signoffs-expiry', user?.id],
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30_000,
    queryFn: async (): Promise<SignoffWithExpiry[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_signoffs')
        .select('id, completion_id, module_id, campaign_id, agent_id, signed_off_at, expires_at, needs_refresh, refresh_reason, signoff_note')
        .eq('agent_id', user!.id);
      if (error) throw error;
      return (data ?? []) as SignoffWithExpiry[];
    },
  });
}

export function useUrgentTrainingCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training', 'urgent-count', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 7);

      // Exclude modules the agent has already completed
      const { data: completions } = await (supabase as any)
        .from('campaign_training_completions')
        .select('module_id')
        .eq('agent_id', user!.id);

      const completedModuleIds: string[] = (completions ?? []).map(
        (c: { module_id: string }) => c.module_id,
      );

      let query = (supabase as any)
        .from('campaign_training_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', user!.id)
        .not('due_date', 'is', null)
        .lte('due_date', cutoff.toISOString());

      if (completedModuleIds.length > 0) {
        query = query.not('module_id', 'in', `(${completedModuleIds.join(',')})`);
      }

      const { count, error } = await query;
      if (error) return 0;
      return count ?? 0;
    },
  });
}

export function useAssignTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      module_id: string;
      agent_id: string;
      due_date?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('campaign_training_assignments')
        .insert({
          module_id: input.module_id,
          agent_id: input.agent_id,
          assigned_by: u.user?.id ?? null,
          due_date: input.due_date ?? null,
          trigger_type: 'manual',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['training', 'my-assignments', vars.agent_id] });
      qc.invalidateQueries({ queryKey: ['training', 'urgent-count', vars.agent_id] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'agent-training-signoffs-needs-refresh'] });
    },
  });
}

export function usePublishedModulesForAssign() {
  return useQuery({
    queryKey: ['training', 'published-modules-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_modules')
        .select('id, title, campaign_id, campaign:campaigns(display_name)')
        .eq('status', 'published')
        .order('title', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; campaign_id: string; campaign: { display_name: string } | null }>;
    },
  });
}

export function useAgentsForAssign() {
  return useQuery({
    queryKey: ['training', 'agent-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('user_id, profiles:user_id(full_name)')
        .eq('role', 'agent');
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; profiles: { full_name: string } | null }>;
    },
  });
}
