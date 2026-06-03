import { useState } from 'react';
import { StaffLayout } from '@/components/staff';
import { TicketList, SubmitTicketDialog } from '@/components/tickets';
import { CreatedTicketsList } from '@/components/tickets/CreatedTicketsList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SalesTickets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  useRealtimeTickets({ workQueueFilter: 'sales' });

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Tickets</h1>
            <p className="text-muted-foreground">
              Manage support tickets from sales inquiries
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </div>

        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">Department Tickets</TabsTrigger>
            <TabsTrigger value="created">My Created Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="department">
            <TicketList
              workQueueFilter="sales"
              linkPrefix="/staff/sales/tickets"
            />
          </TabsContent>
          <TabsContent value="created">
            <CreatedTicketsList excludeSource="sales" />
          </TabsContent>
        </Tabs>
      </div>

      <SubmitTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source="sales"
        showAssignment
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
      />
    </StaffLayout>
  );
}
