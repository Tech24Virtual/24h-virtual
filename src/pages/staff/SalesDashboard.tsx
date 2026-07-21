import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Users, MessageSquare, Calendar, ArrowRight, DollarSign, Clock, Trophy, UserPlus, Sparkles } from 'lucide-react';
import { RunLeadsAgentButton } from '@/components/missions/RunLeadsAgentButton';
import { MissionsList } from '@/components/missions/MissionsList';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { FunnelChart } from '@/components/analytics/FunnelChart';
import { TrendChart } from '@/components/analytics/TrendChart';
import { OverdueFollowupsWidget } from '@/components/admin/crm/OverdueFollowupsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ConvertLeadToAccountDialog, type ConvertLeadInput } from '@/components/admin/ConvertLeadToAccountDialog';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';

// ── My Leads section ─────────────────────────────────────────────────────

const CONVERTIBLE_STAGES = new Set(['new', 'contacted', 'qualified']);

const SOURCE_ICONS: Record<string, string> = {
  wl_partner_request: '🏢',
  affiliate_request: '🤝',
  referral_request: '👥',
  website: '🌐',
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
};

interface MyLeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  source: string | null;
  pipeline_stage: string | null;
  assigned_to: string | null;
  intake_submitted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

function MyLeadCard({
  lead,
  onAssignToMe,
  onConvert,
  assigning,
}: {
  lead: MyLeadRow;
  onAssignToMe: (id: string) => void;
  onConvert: (lead: MyLeadRow) => void;
  assigning: boolean;
}) {
  const days = differenceInCalendarDays(new Date(), new Date(lead.intake_submitted_at || lead.created_at));
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {lead.source && SOURCE_ICONS[lead.source] ? `${SOURCE_ICONS[lead.source]} ` : ''}
            {lead.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{lead.company || lead.email}</p>
        </div>
        <Badge variant="secondary" className={STAGE_BADGE_COLORS[lead.pipeline_stage || 'new'] || 'bg-muted text-muted-foreground'}>
          {lead.pipeline_stage || 'new'}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`}
        </span>
        <div className="flex items-center gap-1">
          {!lead.assigned_to && (
            <Button variant="outline" size="sm" disabled={assigning} onClick={() => onAssignToMe(lead.id)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Assign to me
            </Button>
          )}
          {CONVERTIBLE_STAGES.has(lead.pipeline_stage || 'new') && (
            <Button variant="outline" size="sm" onClick={() => onConvert(lead)}>
              <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
              Convert
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [convertLead, setConvertLead] = useState<ConvertLeadInput | null>(null);
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();

  // Fetch sales stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sales-dashboard-stats'],
    queryFn: async () => {
      const [leadsResult, ticketsResult] = await Promise.all([
        supabase.from('leads').select('id, status, pipeline_stage, created_at', { count: 'exact' }),
        supabase.from('support_tickets').select('id, status', { count: 'exact' }).eq('source', 'sales'),
      ]);

      const leads = leadsResult.data || [];
      const tickets = ticketsResult.data || [];

      return {
        totalLeads: leads.length,
        newLeads: leads.filter(l => l.status === 'new').length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        allLeads: leads,
      };
    },
  });

  // Fetch today's meetings
  const { data: meetingsData } = useQuery({
    queryKey: ['sales-dashboard-meetings'],
    queryFn: async () => {
      const dayStart = startOfDay(now).toISOString();
      const dayEnd = endOfDay(now).toISOString();

      const { data } = await supabase
        .from('meetings')
        .select('id, event_type, scheduled_at, attendee_name, status')
        .gte('scheduled_at', dayStart)
        .lte('scheduled_at', dayEnd)
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: true });

      return data || [];
    },
  });

  // My commissions summary
  const { data: commissionData } = useQuery({
    queryKey: ['sales-dashboard-commissions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_commissions')
        .select('commission_amount, status')
        .eq('sales_rep_id', user!.id);
      const items = data || [];
      return {
        pending: items.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0),
        total: items.reduce((s, c) => s + Number(c.commission_amount), 0),
      };
    },
    enabled: !!user,
  });

  // Follow-ups due today
  const { data: followUpsDue } = useQuery({
    queryKey: ['sales-followups-due', user?.id],
    queryFn: async () => {
      const dayStart = startOfDay(now).toISOString();
      const dayEnd = endOfDay(now).toISOString();
      const { data } = await supabase
        .from('leads')
        .select('id, name, email, next_follow_up')
        .gte('next_follow_up', dayStart)
        .lte('next_follow_up', dayEnd)
        .order('next_follow_up');
      return data || [];
    },
  });

  // Recent wins
  const { data: recentWins } = useQuery({
    queryKey: ['sales-recent-wins'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, company, service_type, updated_at')
        .in('status', ['won', 'active'])
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // My Leads — assigned to me, or a fresh website/sales_team lead nobody owns yet
  const { data: myLeads = [], isLoading: myLeadsLoading } = useQuery({
    queryKey: ['sales-dashboard-my-leads', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company, source, pipeline_stage, assigned_to, intake_submitted_at, created_at, updated_at')
        .or(`assigned_to.eq.${user!.id},source.in.(website,sales_team)`)
        .not('pipeline_stage', 'in', '(active,churned,lost,re_engage)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MyLeadRow[];
    },
  });

  const assignToMe = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase.from('leads').update({ assigned_to: user!.id }).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-my-leads'] });
      toast({ title: 'Assigned', description: 'Lead assigned to you.' });
    },
  });

  const myLeadsNew = myLeads.filter((l) => (l.pipeline_stage || 'new') === 'new');
  const myLeadsInProgress = myLeads.filter((l) => ['contacted', 'qualified', 'proposal'].includes(l.pipeline_stage || ''));
  const myLeadsWon = myLeads.filter(
    (l) => l.pipeline_stage === 'won' && l.updated_at && new Date(l.updated_at) >= new Date(monthStart),
  );

  const todayMeetings = meetingsData || [];
  const nextMeeting = todayMeetings.find(m => new Date(m.scheduled_at) >= now && m.status === 'scheduled');

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sales Dashboard</h1>
            <p className="text-muted-foreground">Manage leads and sales inquiries</p>
          </div>
          <RunLeadsAgentButton />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-green-600">{stats?.newLeads || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-orange-600">{stats?.openTickets || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commissions</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(commissionData?.total || 0).toFixed(0)}</div>
              {(commissionData?.pending || 0) > 0 && (
                <p className="text-xs text-muted-foreground">${commissionData!.pending.toFixed(0)} pending</p>
              )}
            </CardContent>
          </Card>

          <OverdueFollowupsWidget />
        </div>

        {/* Row 2: Meetings + Follow-ups Due + Recent Wins */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Meetings
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/staff/sales/activity/meetings">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{todayMeetings.length}</div>
              {nextMeeting ? (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium">{nextMeeting.event_type || 'Meeting'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(nextMeeting.scheduled_at), 'h:mm a')}
                    {nextMeeting.attendee_name && ` · ${nextMeeting.attendee_name}`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {todayMeetings.length > 0 ? 'All meetings completed' : 'No meetings today'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Follow-ups Due Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!followUpsDue?.length ? (
                <p className="text-sm text-muted-foreground">No follow-ups due today</p>
              ) : (
                <div className="space-y-2">
                  {followUpsDue.slice(0, 4).map(lead => (
                    <Link key={lead.id} to={`/staff/sales/pipeline/leads/${lead.id}`} className="block p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </Link>
                  ))}
                  {followUpsDue.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center">+{followUpsDue.length - 4} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                Recent Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recentWins?.length ? (
                <p className="text-sm text-muted-foreground">No wins yet. Keep going!</p>
              ) : (
                <div className="space-y-2">
                  {recentWins.map(lead => (
                    <Link key={lead.id} to={`/staff/sales/pipeline/leads/${lead.id}`} className="block p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.company || lead.service_type || '—'}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Leads — assigned to me, or unclaimed website/sales_team leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              My Leads
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/sales/pipeline/leads">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {myLeadsLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : myLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads assigned to you yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    New — needs follow-up ({myLeadsNew.length})
                  </p>
                  {myLeadsNew.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nothing new</p>
                  ) : (
                    myLeadsNew.map((lead) => (
                      <MyLeadCard
                        key={lead.id}
                        lead={lead}
                        assigning={assignToMe.isPending}
                        onAssignToMe={(id) => assignToMe.mutate(id)}
                        onConvert={(l) => setConvertLead({ id: l.id, name: l.name, email: l.email, company: l.company })}
                      />
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    In Progress ({myLeadsInProgress.length})
                  </p>
                  {myLeadsInProgress.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nothing in progress</p>
                  ) : (
                    myLeadsInProgress.map((lead) => (
                      <MyLeadCard
                        key={lead.id}
                        lead={lead}
                        assigning={assignToMe.isPending}
                        onAssignToMe={(id) => assignToMe.mutate(id)}
                        onConvert={(l) => setConvertLead({ id: l.id, name: l.name, email: l.email, company: l.company })}
                      />
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Won this month ({myLeadsWon.length})
                  </p>
                  {myLeadsWon.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No wins yet this month</p>
                  ) : (
                    myLeadsWon.map((lead) => (
                      <MyLeadCard
                        key={lead.id}
                        lead={lead}
                        assigning={assignToMe.isPending}
                        onAssignToMe={(id) => assignToMe.mutate(id)}
                        onConvert={(l) => setConvertLead({ id: l.id, name: l.name, email: l.email, company: l.company })}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <FunnelChart title="Lead Pipeline" leads={stats?.allLeads || []} />
          <TrendChart title="New Leads (7 Days)" data={stats?.allLeads || []} dateField="created_at" days={7} color="hsl(var(--chart-3))" />
        </div>

        {/* Recent Leads Missions */}
        <MissionsList title="Recent Leads Missions" missionTypeFilter="leads_agent" limit={5} />

        {/* Sales Tickets */}
        <TicketList
          title="Sales Tickets"
          sourceFilter="sales"
          showSourceBadge={false}
          linkPrefix="/staff/sales/tickets"
        />
      </div>

      <ConvertLeadToAccountDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(v) => !v && setConvertLead(null)}
        onConverted={() => queryClient.invalidateQueries({ queryKey: ['sales-dashboard-my-leads'] })}
      />
    </StaffLayout>
  );
}
