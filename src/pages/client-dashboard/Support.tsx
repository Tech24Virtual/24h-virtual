import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, Plus, Sparkles } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyTicketsList, SubmitTicketDialog } from '@/components/tickets';
import { PiPAssistant } from '@/components/pip/PiPAssistant';

export default function Support() {
  const queryClient = useQueryClient();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Support</h1>
        <p className="text-muted-foreground mt-0.5">Get help from our team</p>
      </div>

      <Tabs defaultValue="ai-support">
        <TabsList>
          <TabsTrigger value="ai-support" className="gap-2">
            <Sparkles className="h-4 w-4" />
            PiP Assistant
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <LifeBuoy className="h-4 w-4" />
            Support Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-support" className="mt-6">
          <PiPAssistant dashboardContext="client" />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>
                  View and manage your support requests
                </CardDescription>
              </div>
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Ticket
              </Button>
            </CardHeader>
            <CardContent>
              <MyTicketsList detailLinkPrefix="/client-dashboard/support" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SubmitTicketDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        source="client_portal"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
          setShowSubmitDialog(false);
        }}
      />
    </DashboardLayout>
  );
}
