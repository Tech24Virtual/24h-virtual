import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PolicyAcknowledgment {
  id: string;
  policy_id: string;
  agent_user_id: string;
  status: 'pending' | 'acknowledged';
  created_at: string;
  acknowledged_at: string | null;
  policy: {
    id: string;
    title: string;
    body_md: string;
    policy_kind: string;
  };
}

export function usePendingPolicyAcknowledgments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['policy-acknowledgments', 'pending', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PolicyAcknowledgment[]> => {
      const { data, error } = await (supabase as any)
        .from('policy_acknowledgments')
        .select('*, policy:campaign_policy_blocks(id, title, body_md, policy_kind)')
        .eq('agent_user_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PolicyAcknowledgment[];
    },
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (acknowledgmentId: string) => {
      const { error } = await (supabase as any)
        .from('policy_acknowledgments')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('id', acknowledgmentId)
        .eq('agent_user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy-acknowledgments', 'pending'] });
      qc.invalidateQueries({ queryKey: ['policy-acknowledgments', 'all'] });
    },
  });
}

// ── Supervisor / admin view ───────────────────────────────────────────────────

export interface AgentAckSummary {
  agent_user_id: string;
  pending_count: number;
}

export function useAgentPendingAckCounts() {
  return useQuery({
    queryKey: ['policy-acknowledgments', 'all', 'pending-counts'],
    queryFn: async (): Promise<AgentAckSummary[]> => {
      const { data, error } = await (supabase as any)
        .from('policy_acknowledgments')
        .select('agent_user_id')
        .eq('status', 'pending');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.agent_user_id] = (counts[row.agent_user_id] ?? 0) + 1;
      }
      return Object.entries(counts).map(([agent_user_id, pending_count]) => ({
        agent_user_id,
        pending_count,
      }));
    },
  });
}
