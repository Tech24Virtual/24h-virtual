import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { clientNavGroups, clientRoot } from '@/config/clientNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Matches MyTicketsList's ownership filter (submitted_by) — without it this
  // count silently included every client's tickets, not just this user's.
  const { data: openTickets = 0 } = useQuery({
    queryKey: ['client-open-tickets', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', user!.id)
        .in('status', ['open', 'in_progress']);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Matches Feedback.tsx's ownership filter (user_id) — without it this count
  // silently included every client's feedback, not just this user's.
  const { data: activeFeedback = 0 } = useQuery({
    queryKey: ['client-active-feedback', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .not('status', 'in', '(resolved,closed)');
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Realtime — the sidebar stays mounted across client-dashboard navigation,
  // so badges never remount to pick up staleTime-based refetches. Invalidate
  // directly on any change instead of waiting for the 60s staleTime to lapse.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('client-sidebar-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `submitted_by=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['client-open-tickets', user.id] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedback', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['client-active-feedback', user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const navGroups = useMemo(() => {
    const badgeMap: Record<string, number> = {
      'Support': openTickets,
      'My Feedback': activeFeedback,
    };
    return clientNavGroups.map(g => ({
      ...g,
      children: g.children.map(c => {
        const badge = badgeMap[c.name];
        return badge ? { ...c, badge } : c;
      }),
    }));
  }, [openTickets, activeFeedback]);

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <DrilldownSidebar
      groups={navGroups}
      rootPath={clientRoot}
      brandTag="Client Portal"
      roleLabel="Client"
    />
  );
}
