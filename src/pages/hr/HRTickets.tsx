import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { HRLayout } from '@/components/hr/HRLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { CreatedTicketsList } from '@/components/tickets/CreatedTicketsList';
import { SubmitTicketDialog } from '@/components/tickets/SubmitTicketDialog';

export default function HRTickets() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">HR Tickets</h1>
            <p className="text-muted-foreground mt-1">Manage internal HR support requests</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Ticket
          </Button>
        </div>

        <Tabs defaultValue="incoming">
          <TabsList>
            <TabsTrigger value="incoming">Incoming Tickets</TabsTrigger>
            <TabsTrigger value="created">My Created Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="incoming" className="mt-4">
            <TicketList workQueueFilter="hr" title="Tickets Routed to HR" />
          </TabsContent>
          <TabsContent value="created" className="mt-4">
            <CreatedTicketsList excludeSource="hr" linkPrefix="/hr-portal/tickets" />
          </TabsContent>
        </Tabs>

        <SubmitTicketDialog open={dialogOpen} onOpenChange={setDialogOpen} source="internal" />
      </div>
    </HRLayout>
  );
}
