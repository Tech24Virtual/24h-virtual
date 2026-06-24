import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Rocket, AlertTriangle, UserPlus, GraduationCap,
  FileCheck, Users, Ticket, CheckSquare, ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { ActiveShiftsWidget } from '@/components/staff/ActiveShiftsWidget';
import { useFulfillmentCounters } from '@/hooks/shared/useFulfillmentCounters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Fulfillment Pulse ─────────────────────────────────────────────────────────

function FulfillmentSupervisorPulse() {
  const { data } = useFulfillmentCounters({ audience: 'supervisor' });
  const aging = data?.aging_over_48h ?? 0;
  const resubs = data?.recent_resubmissions ?? 0;
  if (!aging && !resubs) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {aging > 0 && (
        <Link to="/staff/supervisor/fulfillment?status=under_review">
          <Card className="p-4 border-orange-500/40 hover:border-orange-500/60 transition-colors">
            <p className="text-xs text-muted-foreground">Aging review &gt; 48h</p>
            <p className="text-xl font-semibold mt-1 text-orange-600">{aging}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submissions sitting in review beyond the 48-hour threshold.
            </p>
          </Card>
        </Link>
      )}
      {resubs > 0 && (
        <Link to="/staff/supervisor/fulfillment">
          <Card className="p-4 hover:border-primary/40 transition-colors">
            <p className="text-xs text-muted-foreground">Recent resubmissions (7d)</p>
            <p className="text-xl font-semibold mt-1">{resubs}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Partner packages resubmitted in the last week.
            </p>
          </Card>
        </Link>
      )}
    </div>
  );
}

// ── Action card types ─────────────────────────────────────────────────────────

type BorderColor = 'red' | 'orange' | 'blue';

interface ActionItem {
  key: string;
  borderColor: BorderColor;
  Icon: React.ElementType;
  title: string;
  count: number;
  description: string;
  href: string;
}

const BORDER: Record<BorderColor, string> = {
  red:    'border-l-red-500',
  orange: 'border-l-orange-400',
  blue:   'border-l-blue-400',
};

const COUNT_COLOR: Record<BorderColor, string> = {
  red:    'text-red-600',
  orange: 'text-orange-600',
  blue:   'text-blue-600',
};

function ActionCard({ item, loading }: { item: ActionItem; loading?: boolean }) {
  return (
    <Link to={item.href} className="block group">
      <Card
        className={`rounded-2xl shadow-sm border-l-4 ${BORDER[item.borderColor]} hover:shadow-md transition-shadow`}
      >
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <item.Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground">{item.title}</span>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className={`text-3xl font-bold ${COUNT_COLOR[item.borderColor]}`}>
                  {item.count}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Supervisor';

  // 1. Go-live approvals pending
  const { data: goLiveCount = 0, isLoading: goLiveLoading } = useQuery({
    queryKey: ['supervisor-go-live-pending'],
    queryFn: async () => {
      const { count } = await supabase
        .from('campaign_go_live_status_snapshots')
        .select('campaign_id', { count: 'exact', head: true })
        .or('supervisor_approved.is.null,supervisor_approved.eq.false');
      return count || 0;
    },
    staleTime: 60_000,
  });

  // 2. Open escalations (requires grant from migration)
  const { data: escalationCount = 0, isLoading: escalationsLoading } = useQuery({
    queryKey: ['supervisor-open-escalations'],
    queryFn: async () => {
      const { count } = await supabase
        .from('supervisor_escalations' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      return count || 0;
    },
    staleTime: 60_000,
  });

  // 3. Unassigned clients
  const { data: unassignedCount = 0, isLoading: unassignedLoading } = useQuery({
    queryKey: ['supervisor-unassigned-clients'],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from('client_agent_assignments')
        .select('client_id');
      const assignedIds = new Set((assignments || []).map((a) => a.client_id));
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .in('pipeline_stage', ['active', 'onboarding']);
      return (leads || []).filter((l) => !assignedIds.has(l.id)).length;
    },
    staleTime: 60_000,
  });

  // 4. Training signoffs pending
  const { data: signoffCount = 0, isLoading: signoffsLoading } = useQuery({
    queryKey: ['supervisor-pending-signoffs'],
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
    staleTime: 60_000,
  });

  // 5. Shift reviews pending
  const { data: shiftReviewCount = 0, isLoading: shiftReviewsLoading } = useQuery({
    queryKey: ['supervisor-shift-reviews-pending'],
    queryFn: async () => {
      const { count } = await supabase
        .from('shift_invoices' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted');
      return count || 0;
    },
    staleTime: 60_000,
  });

  // 6. Ambient metrics
  const { data: ambient, isLoading: ambientLoading } = useQuery({
    queryKey: ['supervisor-ambient-metrics'],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const [agentsResult, ticketsResult, tasksResult, clientsResult] = await Promise.all([
        supabase
          .from('agent_shifts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('work_queue', 'supervisor')
          .in('status', ['open', 'in_progress']),
        supabase
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .gte('due_date', todayStr)
          .lt('due_date', tomorrowStr)
          .neq('status', 'completed'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('pipeline_stage', 'active'),
      ]);

      return {
        agentsOnShift: agentsResult.count ?? 0,
        openTickets:   ticketsResult.count ?? 0,
        tasksDueToday: tasksResult.count ?? 0,
        activeClients: clientsResult.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const actionItems: ActionItem[] = useMemo(() => [
    {
      key: 'go-live',
      borderColor: 'red',
      Icon: Rocket,
      title: 'Pending Go-Live Approvals',
      count: goLiveCount,
      description: 'Campaigns ready for your sign-off before going live',
      href: '/staff/supervisor/go-live',
    },
    {
      key: 'escalations',
      borderColor: 'orange',
      Icon: AlertTriangle,
      title: 'Open Escalations',
      count: escalationCount,
      description: 'Active escalations requiring supervisor resolution',
      href: '/staff/supervisor/escalations',
    },
    {
      key: 'assignments',
      borderColor: 'orange',
      Icon: UserPlus,
      title: 'Unassigned Clients',
      count: unassignedCount,
      description: 'Active or onboarding clients with no agent assigned',
      href: '/staff/supervisor/client-assignments',
    },
    {
      key: 'signoffs',
      borderColor: 'blue',
      Icon: GraduationCap,
      title: 'Training Signoffs Pending',
      count: signoffCount,
      description: 'Agent completions awaiting supervisor sign-off',
      href: '/staff/supervisor/training-signoffs',
    },
    {
      key: 'shift-reviews',
      borderColor: 'blue',
      Icon: FileCheck,
      title: 'Shift Reviews Pending',
      count: shiftReviewCount,
      description: 'Submitted shift invoices waiting for approval',
      href: '/staff/supervisor/shift-reviews',
    },
  ], [goLiveCount, escalationCount, unassignedCount, signoffCount, shiftReviewCount]);

  const actionLoading = goLiveLoading || escalationsLoading || unassignedLoading || signoffsLoading || shiftReviewsLoading;

  const ambientMetrics = [
    { Icon: Users,       label: 'Agents on shift',   value: ambient?.agentsOnShift,  color: 'text-green-600' },
    { Icon: Ticket,      label: 'Open tickets',       value: ambient?.openTickets,    color: 'text-blue-600' },
    { Icon: CheckSquare, label: 'Tasks due today',    value: ambient?.tasksDueToday,  color: 'text-orange-600' },
    { Icon: TrendingUp,  label: 'Active clients',     value: ambient?.activeClients,  color: 'text-primary' },
  ] as const;

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-8">

        {/* ── Section 1 — Page Header ───────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-border px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what needs your attention today · {formatToday()}
          </p>
        </div>

        {/* ── Section 2 — Action Required ──────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Action Required
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {actionItems.map((item) => (
              <ActionCard key={item.key} item={item} loading={actionLoading} />
            ))}
          </div>
        </div>

        {/* ── Section 3 — Ambient Metrics ──────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            At a Glance
          </h2>
          <div className="flex flex-wrap gap-2">
            {ambientMetrics.map(({ Icon, label, value, color }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm"
              >
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {ambientLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <>
                    <span className={`font-semibold ${color}`}>{value ?? 0}</span>
                    <span className="text-muted-foreground">{label}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 4 — Fulfillment Pulse ────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Fulfillment Alerts
          </h2>
          <FulfillmentSupervisorPulse />
        </div>

        {/* ── Section 5 — Who's On Shift Now ───────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Who's On Shift Now
          </h2>
          <div className="max-w-xs">
            <ActiveShiftsWidget />
          </div>
        </div>

      </div>
    </StaffLayout>
  );
}
