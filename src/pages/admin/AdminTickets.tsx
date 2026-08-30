import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';

const SOURCE_BREAKDOWN = [
  { source: 'client_portal',          label: 'Client Portal', cardClass: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',       textClass: 'text-blue-700 dark:text-blue-400' },
  { source: 'white_label_portal',     label: 'WL Portal',     cardClass: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800', textClass: 'text-purple-700 dark:text-purple-400' },
  { source: 'white_label_escalation', label: 'WL Escalation', cardClass: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800', textClass: 'text-orange-700 dark:text-orange-400' },
  { source: 'wl_forward',             label: 'WL Forward',    cardClass: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',     textClass: 'text-amber-700 dark:text-amber-400' },
  { source: 'supervisor',             label: 'Supervisor',    cardClass: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',     textClass: 'text-green-700 dark:text-green-400' },
];

export default function AdminTickets() {
  // Enable real-time updates for all tickets
  useRealtimeTickets({ showNotifications: true });

  // Fetch ticket stats
  const { data: stats, isLoading, error: statsError } = useQuery({
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
        bySource: SOURCE_BREAKDOWN.map(s => ({
          source: s.source,
          count: tickets.filter(t => t.source === s.source).length,
        })),
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

      {/* Warning state — shown when the stats query fails */}
      {!!statsError && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Ticket data unavailable. Check permissions on <code className="font-mono text-xs">support_tickets</code> table.
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* Source breakdown — driven by SOURCE_BREAKDOWN constant above */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {SOURCE_BREAKDOWN.map(def => {
          const count = stats?.bySource?.find(s => s.source === def.source)?.count ?? 0;
          return (
            <Card key={def.source} className={def.cardClass}>
              <CardContent className="pt-4">
                <div className={`text-sm ${def.textClass}`}>{def.label}</div>
                {isLoading ? <Skeleton className="h-6 w-10 mt-1" /> : (
                  <div className="text-xl font-bold">{count}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Tickets List */}
      <TicketList
        title="All Tickets"
        showSourceBadge={true}
        showFilters={true}
        showGroupFilter={true}
        limit={50}
        linkPrefix="/admin/tickets"
      />
    </div>
  );
}
