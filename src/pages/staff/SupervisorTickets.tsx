import { useState } from 'react';
import { StaffLayout } from '@/components/staff';
import { TicketList, SubmitTicketDialog } from '@/components/tickets';
import { CreatedTicketsList } from '@/components/tickets/CreatedTicketsList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Users, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SupervisorTickets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  useRealtimeTickets({ workQueueFilter: 'supervisor' });

  const { data: stats } = useQuery({
    queryKey: ['supervisor-ticket-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, status, resolved_at')
        .eq('source', 'client_portal');
      
      if (error) throw error;
      
      const tickets = data || [];
      return {
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolvedToday: tickets.filter(t => 
          t.resolved_at && new Date(t.resolved_at) >= today
        ).length,
      };
    },
  });

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Tickets</h1>
            <p className="text-muted-foreground">
              Oversee and manage all client support tickets
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Ticket className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-bold">{stats?.open ?? '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{stats?.inProgress ?? '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Ticket className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolved Today</p>
                  <p className="text-2xl font-bold">{stats?.resolvedToday ?? '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">Department Tickets</TabsTrigger>
            <TabsTrigger value="created">My Created Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="department">
            <TicketList
              workQueueFilter="supervisor"
              linkPrefix="/staff/supervisor/tickets"
            />
          </TabsContent>
          <TabsContent value="created">
            <CreatedTicketsList excludeSource="client_portal" />
          </TabsContent>
        </Tabs>
      </div>

      <SubmitTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source="supervisor"
        showAssignment
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
      />
    </StaffLayout>
  );
}
