import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';

export default function AdminTickets() {
  // Enable real-time updates for all tickets
  useRealtimeTickets({ showNotifications: true });

  // Fetch ticket stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-ticket-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, status, source, priority');
      
      if (error) throw error;
      
      const tickets = data || [];
      return {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        urgent: tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length,
        bySource: {
          sales: tickets.filter(t => t.source === 'sales').length,
          client: tickets.filter(t => t.source === 'client_portal').length,
          affiliate: tickets.filter(t => t.source === 'affiliate_portal').length,
          whiteLabel: tickets.filter(t => t.source === 'white_label_portal').length,
        },
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage all support tickets across all portals</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-blue-600">{stats?.open || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent/High</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-red-600">{stats?.urgent || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="text-sm text-orange-700 dark:text-orange-400">Sales</div>
            {isLoading ? <Skeleton className="h-6 w-10 mt-1" /> : (
              <div className="text-xl font-bold">{stats?.bySource.sales || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-700 dark:text-blue-400">Clients</div>
            {isLoading ? <Skeleton className="h-6 w-10 mt-1" /> : (
              <div className="text-xl font-bold">{stats?.bySource.client || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="text-sm text-green-700 dark:text-green-400">Affiliates</div>
            {isLoading ? <Skeleton className="h-6 w-10 mt-1" /> : (
              <div className="text-xl font-bold">{stats?.bySource.affiliate || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="text-sm text-purple-700 dark:text-purple-400">Partners</div>
            {isLoading ? <Skeleton className="h-6 w-10 mt-1" /> : (
              <div className="text-xl font-bold">{stats?.bySource.whiteLabel || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Tickets List */}
      <TicketList
        title="All Tickets"
        showSourceBadge={true}
        showFilters={true}
        limit={50}
        linkPrefix="/admin/tickets"
      />
    </div>
  );
}
