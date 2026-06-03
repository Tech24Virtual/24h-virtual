import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { SubmitTicketDialog } from '@/components/tickets/SubmitTicketDialog';
import { CreatedTicketsList } from '@/components/tickets/CreatedTicketsList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TechTickets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tech Support Tickets</h1>
            <p className="text-muted-foreground">View and manage all tech support tickets</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>

        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">Department Tickets</TabsTrigger>
            <TabsTrigger value="created">My Created Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="department">
            <TicketList
              title="All Tech Support Tickets"
              workQueueFilter="tech"
              limit={50}
              linkPrefix="/staff/tech/tickets"
            />
          </TabsContent>
          <TabsContent value="created">
            <CreatedTicketsList excludeSource="tech" />
          </TabsContent>
        </Tabs>
      </div>
      
      <SubmitTicketDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        source="tech"
        showAssignment
      />
    </StaffLayout>
  );
}
