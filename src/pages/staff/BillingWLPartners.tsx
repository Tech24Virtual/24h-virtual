import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Shield, RefreshCw, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function BillingWLPartners() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['billing-wl-partners'],
    queryFn: async () => {
      const { data } = await supabase.from('white_label_partners').select('*').order('company_name');
      return data || [];
    },
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['billing-wl-all-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('white_label_clients').select('*');
      return data || [];
    },
  });

  const { data: allConfigs = [] } = useQuery({
    queryKey: ['billing-wl-all-configs'],
    queryFn: async () => {
      const { data } = await supabase.from('wl_client_service_config').select('*');
      return data || [];
    },
  });

  const { data: usageSummaries = [] } = useQuery({
    queryKey: ['billing-wl-usage-summaries'],
    queryFn: async () => {
      const { data } = await supabase.from('wl_partner_usage_summary').select('*').order('billing_period_start', { ascending: false });
      return data || [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ configId, verified }: { configId: string; verified: boolean }) => {
      const { error } = await supabase.from('wl_client_service_config').update({
        billing_verified: verified,
        verified_at: verified ? new Date().toISOString() : null,
      }).eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-wl-all-configs'] });
      toast.success('Verification updated');
    },
  });

  const triggerUsageCalc = async (partnerId: string) => {
    try {
      await supabase.functions.invoke('calculate-wl-usage', { body: { partnerId } });
      toast.success('Usage calculation triggered');
      queryClient.invalidateQueries({ queryKey: ['billing-wl-usage-summaries'] });
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const totalUnverified = allConfigs.filter(c => !c.billing_verified).length;

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">WL Partner Billing</h1>
          <p className="text-muted-foreground">Verify WL client configurations and manage usage calculations</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-heading">{partners.length}</p>
                <p className="text-xs text-muted-foreground">WL Partners</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-heading">{totalUnverified}</p>
                <p className="text-xs text-muted-foreground">Unverified Clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-heading">{allConfigs.filter(c => c.billing_verified).length}</p>
                <p className="text-xs text-muted-foreground">Verified Clients</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          partners.map(partner => {
            const partnerClients = allClients.filter(c => c.partner_id === partner.id);
            const partnerConfigs = allConfigs.filter(c => c.partner_id === partner.id);
            const unverified = partnerConfigs.filter(c => !c.billing_verified).length;
            const latestUsage = usageSummaries.find(u => u.partner_id === partner.id);

            const isExpanded = expandedId === partner.id;
            return (
              <Card key={partner.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <button
                    type="button"
                    className="flex items-start gap-2 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : partner.id)}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                    <div>
                      <CardTitle className="text-lg">{partner.company_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {partnerClients.length} clients · {unverified > 0 && <span className="text-orange-500 font-medium">{unverified} unverified</span>}
                        {unverified === 0 && <span className="text-green-600">All verified</span>}
                        {latestUsage && ` · $${latestUsage.total_wholesale_cost.toFixed(2)} wholesale`}
                      </p>
                    </div>
                  </button>
                  <Button size="sm" variant="outline" onClick={() => triggerUsageCalc(partner.id)}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Calculate Usage
                  </Button>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 pb-4">
                    {latestUsage ? (
                      <div className="grid sm:grid-cols-3 gap-x-6 gap-y-2 text-sm border rounded-lg p-4 bg-muted/30">
                        <div><span className="text-muted-foreground">Period:</span> {latestUsage.billing_period_start} – {latestUsage.billing_period_end}</div>
                        <div><span className="text-muted-foreground">Active Clients:</span> {latestUsage.active_client_count}</div>
                        <div><span className="text-muted-foreground">Total Calls:</span> {latestUsage.total_calls_all_clients.toLocaleString()}</div>
                        <div><span className="text-muted-foreground">Total Minutes:</span> {latestUsage.total_minutes_all_clients.toLocaleString()}</div>
                        <div><span className="text-muted-foreground">Campaign Fees:</span> ${latestUsage.total_campaign_fees.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Wholesale Cost:</span> ${latestUsage.total_wholesale_cost.toFixed(2)}</div>
                        {latestUsage.volume_discount_active && (
                          <div className="sm:col-span-3 text-green-600">
                            Volume discount active{latestUsage.volume_discount_rate ? ` (${(latestUsage.volume_discount_rate * 100).toFixed(0)}%)` : ''}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No usage summary calculated yet — use "Calculate Usage" above.</p>
                    )}
                  </CardContent>
                )}
                {partnerClients.length > 0 && (
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Language</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partnerClients.map(client => {
                          const config = partnerConfigs.find(c => c.wl_client_id === client.id);
                          return (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">{client.client_name}</TableCell>
                              <TableCell>{client.service_type}</TableCell>
                              <TableCell>{client.language_support}</TableCell>
                              <TableCell>
                                {config?.billing_verified ? (
                                  <Badge className="bg-green-500/10 text-green-600">Verified</Badge>
                                ) : (
                                  <Badge className="bg-orange-500/10 text-orange-600">Unverified</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {config && (
                                  <Button
                                    size="sm"
                                    variant={config.billing_verified ? 'outline' : 'default'}
                                    onClick={() => verifyMutation.mutate({ configId: config.id, verified: !config.billing_verified })}
                                    disabled={verifyMutation.isPending}
                                  >
                                    {config.billing_verified ? 'Unverify' : 'Verify'}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </StaffLayout>
  );
}
