import { useQuery } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketList } from '@/components/tickets/TicketList';
import { TrendChart } from '@/components/analytics/TrendChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, CheckCircle2, AlertTriangle, Clock, Percent, Wrench, BookOpen, CalendarClock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-primary/10 text-primary',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

export default function TechDashboard() {

  const { data: ticketStats } = useQuery({
    queryKey: ['tech-ticket-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('status, created_at, resolved_at')
        .eq('source', 'tech');

      if (error) throw error;

      const total = data?.length || 0;
      const open = data?.filter((t) => t.status === 'open').length || 0;
      const inProgress = data?.filter((t) => t.status === 'in_progress').length || 0;
      const resolved = data?.filter((t) => t.status === 'resolved' || t.status === 'closed').length || 0;
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return { total, open, inProgress, resolved, resolutionRate, allTickets: data || [] };
    },
  });

  const { data: issueStats } = useQuery({
    queryKey: ['tech-issue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tech_issues').select('status, priority').is('resolved_at', null);
      if (error) throw error;
      const critical = data?.filter(i => i.priority === 'critical').length || 0;
      const high = data?.filter(i => i.priority === 'high').length || 0;
      return { total: data?.length || 0, critical, high };
    },
  });

  const { data: recentIssues } = useQuery({
    queryKey: ['tech-recent-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_issues')
        .select('id, title, status, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: weeklyTicketCount } = useQuery({
    queryKey: ['tech-weekly-ticket-count'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count, error } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('work_queue', 'tech')
        .eq('status', 'open')
        .gte('created_at', sevenDaysAgo.toISOString());
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tech Support Dashboard</h1>
          <p className="text-muted-foreground">Manage technical support tickets, system issues, and knowledge base</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{ticketStats?.total || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{ticketStats?.open || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{ticketStats?.inProgress || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{ticketStats?.resolved || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{ticketStats?.resolutionRate || 0}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <Wrench className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{issueStats?.total || 0}</div>
              {(issueStats?.critical || 0) > 0 && (
                <Badge variant="destructive" className="mt-1 text-xs">{issueStats?.critical} critical</Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open This Week</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{weeklyTicketCount ?? 0}</div></CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to="/staff/tech/issues"><Wrench className="h-4 w-4 mr-2" />System Issues</Link></Button>
          <Button asChild variant="outline"><Link to="/staff/tech/knowledge-base"><BookOpen className="h-4 w-4 mr-2" />Knowledge Base</Link></Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TrendChart
            title="Ticket Volume (7 Days)"
            data={ticketStats?.allTickets || []}
            dateField="created_at"
            days={7}
            color="hsl(var(--chart-1))"
          />
          <TrendChart
            title="Resolutions (7 Days)"
            data={(ticketStats?.allTickets || []).filter((t: any) => t.resolved_at)}
            dateField="resolved_at"
            days={7}
            color="hsl(var(--chart-2))"
          />
        </div>

        <TicketList
          title="Tech Support Tickets"
          workQueueFilter="tech"
          limit={10}
          linkPrefix="/staff/tech/tickets"
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent System Issues</CardTitle>
            <Link to="/staff/tech/issues" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!recentIssues?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No open issues</p>
            ) : (
              <div className="space-y-2">
                {recentIssues.map(issue => (
                  <Link
                    key={issue.id}
                    to="/staff/tech/issues"
                    className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={ISSUE_STATUS_COLORS[issue.status] || 'bg-muted text-muted-foreground'}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <span className="font-medium truncate">{issue.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">
                      {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}