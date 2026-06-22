import { useQuery } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketList } from '@/components/tickets/TicketList';
import { TrendChart } from '@/components/analytics/TrendChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, CheckCircle2, AlertTriangle, Clock, Percent, Wrench, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      </div>
    </StaffLayout>
  );
}