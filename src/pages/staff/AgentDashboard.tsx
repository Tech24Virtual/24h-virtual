import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Users, MessageSquare, CheckCircle, ShieldAlert, Star, Calendar, GraduationCap } from 'lucide-react';
import { DashboardOnboarding } from '@/components/onboarding/DashboardOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { TrendChart } from '@/components/analytics/TrendChart';
import { ComplianceChart } from '@/components/analytics/ComplianceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentScheduleView } from '@/components/staff/AgentScheduleView';
import { SlackMappingBanner } from '@/components/staff/SlackMappingBanner';
import { Link } from 'react-router-dom';

import { usePageView } from '@/lib/analytics';

export default function AgentDashboard() {
  usePageView('agent_dashboard', 'agent');
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(!(profile as any)?.onboarding_completed);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['agent-dashboard-stats'],
    queryFn: async () => {
      const [ticketsResult, callsResult, tasksResult] = await Promise.all([
        supabase.from('support_tickets').select('id, status, created_at', { count: 'exact' }).eq('source', 'client_portal'),
        supabase.from('call_logs').select('id', { count: 'exact' }),
        supabase.from('crm_tasks').select('id, status, priority, due_date, completed_at, created_at'),
      ]);

      const tickets = ticketsResult.data || [];
      const tasks = tasksResult.data || [];

      return {
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        totalCalls: callsResult.count || 0,
        waitingTickets: tickets.filter(t => t.status === 'waiting').length,
        allTickets: tickets,
        allTasks: tasks,
      };
    },
  });

  const { data: openShiftCount = 0 } = useQuery({
    queryKey: ['agent-open-shift-count'],
    queryFn: async () => {
      const { data: mySkills } = await supabase.from('agent_skills').select('skill_name').eq('agent_id', user!.id);
      const skills = (mySkills || []).map(s => s.skill_name);
      const { data: shifts } = await supabase.from('open_shifts').select('id, required_skills').eq('status', 'open');
      return (shifts || []).filter(s => s.required_skills.length === 0 || s.required_skills.some((sk: string) => skills.includes(sk))).length;
    },
    enabled: !!user?.id,
  });

  // My assigned clients count
  const { data: myClientsCount = 0 } = useQuery({
    queryKey: ['my-assigned-clients-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('client_agent_assignments').select('id', { count: 'exact', head: true }).eq('agent_id', user!.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Latest performance score
  const { data: latestReview } = useQuery({
    queryKey: ['my-latest-review', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_performance_reviews')
        .select('overall_score, period_end')
        .eq('agent_id', user!.id)
        .eq('status', 'published')
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Pending time-off
  const { data: pendingTimeOff = 0 } = useQuery({
    queryKey: ['my-pending-timeoff', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('agent_id', user!.id).eq('status', 'pending');
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Training progress
  const { data: trainingProgress } = useQuery({
    queryKey: ['my-training-progress', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_onboarding')
        .select('training_checklist')
        .eq('applicant_user_id', user!.id)
        .maybeSingle();
      if (!data?.training_checklist) return null;
      const items = data.training_checklist as any[];
      if (items.length === 0) return null;
      const completed = items.filter((i: any) => i.completed).length;
      return Math.round((completed / items.length) * 100);
    },
    enabled: !!user?.id,
  });

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        {showOnboarding && (
          <DashboardOnboarding dashboardContext="agent" onComplete={() => setShowOnboarding(false)} />
        )}
        <SlackMappingBanner />
        <div>
          <h1 className="text-2xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">Handle client support and call management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.openTickets || 0}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.resolvedTickets || 0}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>}
            </CardContent>
          </Card>
          <Link to="/staff/agent/clients" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">My Clients</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myClientsCount}</div>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Shifts</CardTitle>
              <ShieldAlert className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openShiftCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Cross-Department Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/staff/agent/my-profile" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-3">
                <Star className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{latestReview ? Number(latestReview.overall_score).toFixed(1) : '—'}</p>
                  <p className="text-sm text-muted-foreground">My Performance</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/staff/agent/time-off" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingTimeOff}</p>
                  <p className="text-sm text-muted-foreground">Pending Time Off</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          {trainingProgress !== null && (
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{trainingProgress}%</p>
                  <p className="text-sm text-muted-foreground">Training Progress</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Analytics Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <TrendChart title="Tickets (7 Days)" data={stats?.allTickets || []} dateField="created_at" days={7} color="hsl(var(--chart-1))" />
          <ComplianceChart title="Task SLA Compliance" tasks={stats?.allTasks || []} />
        </div>

        {/* Upcoming Schedule */}
        <AgentScheduleView compact />

        {/* Client Tickets */}
        <TicketList title="Client Support Tickets" workQueueFilter="agent" showSourceBadge={false} linkPrefix="/staff/agent/tickets" />
      </div>
    </StaffLayout>
  );
}
