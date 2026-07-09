import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import {
  getStaffNav,
  getStaffRoot,
  STAFF_PORTAL_TITLES,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from '@/config/staffNav';
import { useActiveShiftTime } from '@/components/staff/ShiftClockWidget';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUrgentTrainingCount } from '@/hooks/campaign-os/useTrainingAssignments';

interface StaffSidebarProps {
  role: StaffRole;
}

export function StaffSidebar({ role }: StaffSidebarProps) {
  const { user } = useAuth();
  const groups = useMemo(() => getStaffNav(role), [role]);
  const root = getStaffRoot(role);
  const activeShiftTime = useActiveShiftTime(role === 'agent');

  const isAgent = role === 'agent';
  const isSupervisor = role === 'supervisor';

  // ── Agent-only badge counts ───────────────────────────────────────────────

  const { data: openTaskCount = 0 } = useQuery({
    queryKey: ['agent-open-tasks', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('crm_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user!.id)
        .neq('status', 'completed')
        .neq('status', 'closed');
      return count || 0;
    },
    enabled: !!user?.id && isAgent,
  });

  const { data: openTicketCount = 0 } = useQuery({
    queryKey: ['agent-open-tickets', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('submitted_by', user!.id)
        .in('status', ['open', 'in_progress']);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id && isAgent,
  });

  const { data: urgentTrainingCount = 0 } = useUrgentTrainingCount();

  const { data: pendingTimeOff = 0 } = useQuery({
    queryKey: ['pending-time-off', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('time_off_requests')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user!.id)
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!user?.id && isAgent,
  });

  // Unread notifications → badges the Messages child
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages-sidebar', user?.id],
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      return count ?? 0;
    },
    enabled: !!user?.id && isAgent,
  });

  // New FAQs this week → combined with unacknowledgedPolicies on the Scripts badge
  const { data: newFaqs = 0 } = useQuery({
    queryKey: ['new-faqs-sidebar', user?.id],
    staleTime: 120_000,
    queryFn: async () => {
      // Use the timestamp from when the agent last visited the Scripts page.
      // Falls back to 7 days ago on first visit so genuinely new FAQs still surface.
      const lastViewed = localStorage.getItem(`faq-last-viewed-${user?.id}`);
      const since = lastViewed ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('campaign_faq_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gt('created_at', since);
      return count ?? 0;
    },
    enabled: !!user?.id && isAgent,
  });

  // Unacknowledged policies → combined with newFaqs on the Scripts badge.
  // Two-step: fetch ack'd policy IDs first, then count the rest.
  // Wrapped in try/catch so a missing policy_acknowledgements table never crashes the sidebar.
  const { data: unacknowledgedPolicies = 0 } = useQuery({
    queryKey: ['unacknowledged-policies-sidebar', user?.id],
    staleTime: 120_000,
    queryFn: async () => {
      try {
        const { data: acked } = await (supabase as any)
          .from('policy_acknowledgements')
          .select('policy_id')
          .eq('agent_id', user!.id);
        const ackedIds: string[] = (acked ?? []).map((r: any) => String(r.policy_id));

        let q = (supabase as any)
          .from('campaign_policy_blocks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');
        if (ackedIds.length > 0) {
          q = q.not('id', 'in', `(${ackedIds.join(',')})`);
        }
        const { count } = await q;
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    enabled: !!user?.id && isAgent,
  });

  // Pending shift invoice submissions → badges the Shifts child
  const { data: pendingInvoices = 0 } = useQuery({
    queryKey: ['pending-invoices-sidebar', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('shift_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user!.id)
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!user?.id && isAgent,
  });

  // ── Supervisor-only badge counts ─────────────────────────────────────────────

  const { data: openEscalations = 0 } = useQuery({
    queryKey: ['open-escalations-badge', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('supervisor_escalations' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      return count ?? 0;
    },
    enabled: !!user?.id && isSupervisor,
  });

  const { data: pendingSignoffsCount = 0 } = useQuery({
    queryKey: ['pending-signoffs-badge', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const [completionsResult, signoffsResult] = await Promise.all([
        supabase.from('campaign_training_completions').select('id'),
        (supabase as any).from('campaign_training_signoffs').select('completion_id'),
      ]);
      const signedIds = new Set(
        (signoffsResult.data ?? []).map((s: { completion_id: string }) => s.completion_id),
      );
      return (completionsResult.data ?? []).filter(
        (c: { id: string }) => !signedIds.has(c.id),
      ).length;
    },
    enabled: !!user?.id && isSupervisor,
  });

  const { data: pendingShiftReviews = 0 } = useQuery({
    queryKey: ['pending-shift-reviews-badge', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('shift_invoices' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');
      return count ?? 0;
    },
    enabled: !!user?.id && isSupervisor,
  });

  const { data: pendingScriptReviews = 0 } = useQuery({
    queryKey: ['pending-script-reviews', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('script_change_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'needs_info']);
      return count ?? 0;
    },
    enabled: !!user?.id && isSupervisor,
  });

  const { data: supervisorTickets = 0 } = useQuery({
    queryKey: ['supervisor-tickets-badge', user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('work_queue', 'supervisor')
        .in('status', ['open', 'in_progress']);
      return count ?? 0;
    },
    enabled: !!user?.id && isSupervisor,
  });

  // ── Onboarding completion — hide the Onboarding nav item once done ──────────

  const { data: agentOnboarding } = useQuery({
    queryKey: ['agent-onboarding-nav', user?.id],
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_onboarding')
        .select('status')
        .eq('applicant_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);
      return data ?? null;
    },
    enabled: !!user?.id && isAgent,
    retry: 1,
  });

  const onboardingComplete = agentOnboarding?.[0]?.status === 'completed';

  // ── Build nav groups with injected child badges ──────────────────────────
  // Group-level dots are auto-computed by DrilldownSidebar from children badges —
  // no separate agentBadges map needed.
  const navGroups = useMemo(() => {
    if (!isAgent && !isSupervisor) return groups;

    if (isSupervisor) {
      const supervisorBadgeMap: Record<string, number> = {
        Escalations:      openEscalations,
        Signoffs:         pendingSignoffsCount,
        'Shift Reviews':  pendingShiftReviews,
        'Script Reviews': pendingScriptReviews,
        Tickets:          supervisorTickets,
      };
      return groups.map(g => ({
        ...g,
        children: g.children.map(c => {
          const badge = supervisorBadgeMap[c.name];
          return badge ? { ...c, badge } : c;
        }),
      }));
    }

    // Scripts aggregates Policies + new FAQs (both live on the same page as tabs)
    const childBadgeMap: Record<string, number> = {
      Tasks:      openTaskCount,
      Tickets:    openTicketCount,
      Training:   urgentTrainingCount,
      'Time Off': pendingTimeOff,
      Messages:   unreadMessages,
      Shifts:     pendingInvoices,
      Scripts:    unacknowledgedPolicies + newFaqs,
    };

    return groups.map(g => {
      const visibleChildren = (onboardingComplete && g.name === 'Profile')
        ? g.children.filter(c => c.name !== 'Onboarding')
        : g.children;

      const childrenWithBadges = visibleChildren.map(c => {
        const badge = childBadgeMap[c.name];
        return badge ? { ...c, badge } : c;
      });

      return { ...g, children: childrenWithBadges };
    });
  }, [
    groups, isAgent, isSupervisor, onboardingComplete,
    openEscalations, pendingSignoffsCount, pendingShiftReviews, pendingScriptReviews, supervisorTickets,
    openTaskCount, openTicketCount, urgentTrainingCount, pendingTimeOff,
    unreadMessages, pendingInvoices, unacknowledgedPolicies, newFaqs,
  ]);

  return (
    <DrilldownSidebar
      groups={navGroups}
      rootPath={root}
      brandTag={STAFF_PORTAL_TITLES[role]}
      roleLabel={STAFF_ROLE_LABELS[role]}
      renderGroupExtra={(group) => {
        if (isAgent && group.name === 'Schedule' && activeShiftTime) {
          return (
            <span className="text-xs font-mono text-success">{activeShiftTime}</span>
          );
        }
        return null;
      }}
    />
  );
}
