import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, Sparkles } from 'lucide-react';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyTicketsList, SubmitTicketDialog } from '@/components/tickets';
import { PiPAssistant } from '@/components/pip/PiPAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function WhiteLabelSupport() {
  const { user } = useAuth();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [partnerId, setPartnerId] = useState<string | undefined>();
  const [brandName, setBrandName] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    const fetchPartnerInfo = async () => {
      const { data: partner } = await supabase
        .from('white_label_partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (partner) {
        setPartnerId(partner.id);
        const { data: branding } = await supabase
          .from('white_label_branding')
          .select('company_name')
          .eq('partner_id', partner.id)
          .maybeSingle();
        if (branding?.company_name) setBrandName(branding.company_name);
      }
    };
    fetchPartnerInfo();
  }, [user]);

  const assistantLabel = brandName ? `${brandName} Assistant` : 'AI Assistant';

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Get help from our partner support team</p>
        </div>

        <Tabs defaultValue="ai-support">
          <TabsList>
            <TabsTrigger value="ai-support" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {assistantLabel}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <LifeBuoy className="h-4 w-4" />
              Support Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-support" className="mt-6">
            <PiPAssistant dashboardContext="white_label" partnerId={partnerId} brandName={brandName} />
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5" />
                    Support Tickets
                  </CardTitle>
                  <CardDescription>View and manage your support requests</CardDescription>
                </div>
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Ticket
                </Button>
              </CardHeader>
              <CardContent>
                <MyTicketsList detailLinkPrefix="/white-label-dashboard/account/support" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SubmitTicketDialog
          open={showSubmitDialog}
          onOpenChange={setShowSubmitDialog}
          source="white_label_portal"
          partnerId={partnerId}
          onSuccess={() => {}}
        />
      </div>
    </WhiteLabelLayout>
  );
}
