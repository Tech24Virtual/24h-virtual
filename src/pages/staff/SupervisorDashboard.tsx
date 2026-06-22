import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, AlertTriangle, CheckCircle, UserPlus, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { TrendChart } from '@/components/analytics/TrendChart';
import { ComplianceChart } from '@/components/analytics/ComplianceChart';
import { OverdueFollowupsWidget } from '@/components/admin/crm/OverdueFollowupsWidget';
import { ActiveShiftsWidget } from '@/components/staff/ActiveShiftsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { FulfillmentPulseCards } from '@/components/admin/fulfillment/FulfillmentPulseCards';
import { useFulfillmentCounters } from '@/hooks/shared/useFulfillmentCounters';

export default function SupervisorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['supervisor-dashboard-stats'],
    queryFn: async () => {
      const [ticketsResult, tasksResult] = await Promise.all([
        supabase.from('support_tickets').select('id, status, priority, created_at', { count: 'exact' }).eq('source', 'client_portal'),
        supabase.from('crm_tasks').select('id, status, priority, due_date, completed_at, created_at'),
      ]);

      const tickets = ticketsResult.data || [];
      const tasks = tasksResult.data || [];

      return {
        totalTickets: tickets.length,
        urgentTickets: tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        resolvedToday: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        allTickets: tickets,
        allTasks: tasks,
      };
    },
  });

  // Incoming clients from Sales that need agent assignment
  const { data: unassignedCount = 0 } = useQuery({
    queryKey: ['supervisor-unassigned-clients'],
    queryFn: async () => {
      const { data: assignments } = await supabase.from('client_agent_assignments').select('client_id');
      const assignedIds = new Set((assignments || []).map(a => a.client_id));
      const { data: leads } = await supabase.from('leads').select('id').in('pipeline_stage', ['active', 'onboarding']);
      return (leads || []).filter(l => !assignedIds.has(l.id)).length;
    },
  });

  // Open escalations
  const { data: openEscalations = 0 } = useQuery({
    queryKey: ['supervisor-open-escalations'],
    queryFn: async () => {
      const { count } = await supabase.from('supervisor_escalations').select('id', { count: 'exact', head: true }).eq('status', 'open');
      return count || 0;
    },
  });

  // Avg performance score
  const { data: avgPerformance } = useQuery({
    queryKey: ['supervisor-avg-performance'],
    queryFn: async () => {
      const { data } = await supabase.from('agent_performance_reviews').select('overall_score').eq('status', 'published');
      if (!data || data.length === 0) return null;
      const avg = data.reduce((sum, r) => sum + Number(r.overall_score), 0) / data.length;
      return avg.toFixed(1);
    },
  });

  // Sales pipeline visibility
  const { data: pipelineCounts } = useQuery({
    queryKey: ['supervisor-sales-pipeline'],
    queryFn: async () => {
      const { data: leads } = await supabase.from('leads').select('pipeline_stage').in('pipeline_stage', ['ready_for_billing', 'onboarding', 'active']);
      const counts: Record<string, number> = { ready_for_billing: 0, onboarding: 0, active: 0 };
      (leads || []).forEach(l => { if (l.pipeline_stage && counts[l.pipeline_stage] !== undefined) counts[l.pipeline_stage]++; });
      return counts;
    },
  });

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">Oversee agent performance and escalations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.totalTickets || 0}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Urgent/High</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-destructive">{stats?.urgentTickets || 0}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.resolvedToday || 0}</div>}
            </CardContent>
          </Card>
        </div>

        {/* Cross-Department Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/staff/supervisor/client-assignments" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{unassignedCount}</p>
                    <p className="text-sm text-muted-foreground">Clients Need Assignment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/staff/supervisor/escalations" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{openEscalations}</p>
                    <p className="text-sm text-muted-foreground">Open Escalations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/staff/supervisor/performance" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{avgPerformance || '—'}</p>
                    <p className="text-sm text-muted-foreground">Avg Agent Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">Client Pipeline</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{pipelineCounts?.ready_for_billing || 0} Billing</Badge>
                <Badge variant="outline">{pipelineCounts?.onboarding || 0} Onboarding</Badge>
                <Badge>{pipelineCounts?.active || 0} Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverdueFollowupsWidget />
          <ActiveShiftsWidget />
        </div>

        {/* Analytics Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <ComplianceChart title="Team SLA Compliance" tasks={stats?.allTasks || []} />
          <TrendChart title="Ticket Volume (7 Days)" data={stats?.allTickets || []} dateField="created_at" days={7} color="hsl(var(--chart-4))" />
        </div>

        {/* Client Tickets */}
        <TicketList title="Client Support Tickets" workQueueFilter="supervisor" showSourceBadge={false} linkPrefix="/staff/supervisor/tickets" />
      </div>
    </StaffLayout>
  );
}

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
