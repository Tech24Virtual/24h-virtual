import { useState, useEffect } from 'react';
import { Bot, LifeBuoy, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { PiPAssistant } from '@/components/pip/PiPAssistant';
import { MyTicketsList, SubmitTicketDialog } from '@/components/tickets';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function AffiliateSupport() {
  const { user } = useAuth();
  const [affiliateId, setAffiliateId] = useState<string | undefined>();
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('affiliates').select('id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setAffiliateId(data.id);
    });
  }, [user]);

  return (
    <AffiliateLayout title="Support">
      <Tabs defaultValue="ai-support">
        <TabsList>
          <TabsTrigger value="ai-support" className="gap-2"><Bot className="h-4 w-4" />AI Support</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2"><LifeBuoy className="h-4 w-4" />Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-support" className="mt-4">
          <PiPAssistant dashboardContext="affiliate" />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg"><LifeBuoy className="h-5 w-5" />Support Tickets</CardTitle>
                <CardDescription>Get help from our affiliate support team</CardDescription>
              </div>
              <Button onClick={() => setShowTicketDialog(true)}><Plus className="h-4 w-4 mr-2" />Submit Ticket</Button>
            </CardHeader>
            <CardContent><MyTicketsList /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SubmitTicketDialog
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        source="affiliate_portal"
        affiliateId={affiliateId}
      />
    </AffiliateLayout>
  );
}
