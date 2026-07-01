import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { clientNavGroups, clientRoot } from '@/config/clientNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const { data: openTickets = 0 } = useQuery({
    queryKey: ['client-open-tickets', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: activeFeedback = 0 } = useQuery({
    queryKey: ['client-active-feedback', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '(resolved,closed)');
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

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
