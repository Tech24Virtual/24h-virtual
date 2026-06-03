import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Users, DollarSign, FileText, Map, BarChart3, Shield, RefreshCw, Plus, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PartnerFulfillmentMiniTable } from '@/components/admin/fulfillment/PartnerFulfillmentMiniTable';

export default function AdminPartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch partner
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['admin-partner', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('white_label_partners').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch pricing
  const { data: pricing } = useQuery({
    queryKey: ['admin-partner-pricing', id],
    queryFn: async () => {
      const { data } = await supabase.from('wl_wholesale_pricing').select('*').eq('partner_id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch branding to resolve portal slug
  const { data: branding } = useQuery({
    queryKey: ['admin-partner-branding', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('white_label_branding')
        .select('company_name, logo_url')
        .eq('partner_id', id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-partner-clients', id],
    queryFn: async () => {
      const { data } = await supabase.from('white_label_clients').select('*').eq('partner_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch service configs
  const { data: serviceConfigs = [] } = useQuery({
    queryKey: ['admin-partner-configs', id],
    queryFn: async () => {
      const { data } = await supabase.from('wl_client_service_config').select('*').eq('partner_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch campaign mappings
  const { data: mappings = [] } = useQuery({
    queryKey: ['admin-partner-mappings', id],
    queryFn: async () => {
      const { data } = await supabase.from('client_report_mappings').select('*').eq('partner_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch usage summaries
  const { data: usageSummaries = [] } = useQuery({
    queryKey: ['admin-partner-usage', id],
    queryFn: async () => {
      const { data } = await supabase.from('wl_partner_usage_summary').select('*').eq('partner_id', id!).order('billing_period_start', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch usage records per client
  const { data: usageRecords = [] } = useQuery({
    queryKey: ['admin-partner-usage-records', id],
    queryFn: async () => {
      const { data } = await supabase.from('wl_usage_records').select('*').eq('partner_id', id!).order('billing_period_start', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch agreements
  const { data: agreements = [] } = useQuery({
    queryKey: ['admin-partner-agreements', id],
    queryFn: async () => {
      const { data } = await supabase.from('wl_terms_agreements').select('*').eq('partner_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch addon products
  const { data: addonProducts = [] } = useQuery({
    queryKey: ['addon-products'],
    queryFn: async () => {
      const { data } = await supabase.from('addon_products').select('*').eq('is_active', true);
      return data || [];
    },
  });

  // Fetch addon pricing for this partner
  const { data: addonPricing = [] } = useQuery({
    queryKey: ['admin-partner-addon-pricing', id],
    queryFn: async () => {
      const { data } = await supabase.from('wl_addon_pricing').select('*').eq('partner_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Verify/unverify mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ configId, verified }: { configId: string; verified: boolean }) => {
      const { error } = await supabase.from('wl_client_service_config').update({
        billing_verified: verified,
        verified_at: verified ? new Date().toISOString() : null,
      }).eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-configs', id] });
      toast.success('Verification updated');
    },
  });

  // Save pricing mutation
  const savePricingMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!pricing?.id) throw new Error('No pricing found');
      const { error } = await supabase.from('wl_wholesale_pricing').update(updates).eq('id', pricing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-pricing', id] });
      toast.success('Pricing saved');
    },
  });

  // Trigger usage calculation
  const triggerUsageCalc = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-wl-usage', {
        body: { partnerId: id },
      });
      if (error) throw error;
      toast.success('Usage calculation triggered');
      queryClient.invalidateQueries({ queryKey: ['admin-partner-usage', id] });
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  // Create campaign mapping
  const [newMapping, setNewMapping] = useState({ wl_client_id: '', match_value: '' });
  const createMappingMutation = useMutation({
    mutationFn: async () => {
      // We need a lead_id - use a placeholder or the first available
      const { data: leadData } = await supabase.from('leads').select('id').limit(1).single();
      const { error } = await supabase.from('client_report_mappings').insert({
        partner_id: id!,
        wl_client_id: newMapping.wl_client_id,
        match_value: newMapping.match_value,
        match_type: 'wl_campaign',
        lead_id: leadData?.id || '',
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-mappings', id] });
      setNewMapping({ wl_client_id: '', match_value: '' });
      toast.success('Mapping created');
    },
  });

  if (partnerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!partner) {
    return <div className="text-center py-12 text-muted-foreground">Partner not found.</div>;
  }

  const activeClients = clients.filter(c => c.status === 'active').length;
  const unverifiedConfigs = serviceConfigs.filter(c => !c.billing_verified).length;
  const latestUsage = usageSummaries[0];

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600',
    approved: 'bg-green-500/10 text-green-600',
    suspended: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/partners"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-heading">{partner.company_name}</h1>
            <Badge className={statusColor[partner.status || 'pending']}>{partner.status || 'pending'}</Badge>
            {partner.tier && <Badge variant="outline">{partner.tier}</Badge>}
          </div>
          <p className="text-muted-foreground">{partner.contact_name} · {partner.email}</p>
        </div>
        {(() => {
          const brandName = branding?.company_name || partner.company_name;
          const slug = brandName
            ? brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            : '';
          if (!slug) return null;
          return (
            <Button variant="outline" asChild>
              <Link to={`/portal/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Portal
              </Link>
            </Button>
          );
        })()}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-heading">{clients.length}</p>
                <p className="text-xs text-muted-foreground">{activeClients} active clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-cta" />
              <div>
                <p className="text-2xl font-bold text-heading">{latestUsage?.total_minutes_all_clients?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">Monthly minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-heading">${latestUsage?.total_wholesale_cost?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-muted-foreground">Monthly wholesale</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-heading">{unverifiedConfigs}</p>
                <p className="text-xs text-muted-foreground">Unverified clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Wholesale Pricing</TabsTrigger>
          <TabsTrigger value="addons">Add-on Pricing</TabsTrigger>
          <TabsTrigger value="clients">Clients & Verification</TabsTrigger>
          <TabsTrigger value="mappings">Campaign Mappings</TabsTrigger>
          <TabsTrigger value="usage">Usage & Billing</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Company Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Company" value={partner.company_name} />
                <InfoRow label="Contact" value={partner.contact_name} />
                <InfoRow label="Email" value={partner.email} />
                <InfoRow label="Phone" value={partner.phone || '-'} />
                <InfoRow label="Website" value={partner.website || '-'} />
                <InfoRow label="Industry" value={partner.industry || '-'} />
                <InfoRow label="Company Size" value={partner.company_size || '-'} />
                <InfoRow label="Address" value={partner.address || '-'} />
                <InfoRow label="Tier" value={partner.tier || 'reseller'} />
                <InfoRow label="Monthly Fee" value={`$${partner.monthly_fee || 0}`} />
                <InfoRow label="Joined" value={partner.created_at ? format(new Date(partner.created_at), 'MMM d, yyyy') : '-'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Volume Discount Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Discount Active" value={latestUsage?.volume_discount_active ? 'Yes' : 'No'} />
                <InfoRow label="Fixed Rate" value={pricing?.volume_discount_fixed_rate ? `$${pricing.volume_discount_fixed_rate}/min` : 'Not set'} />
                <InfoRow label="Min Minutes Threshold" value={`${pricing?.volume_discount_min_minutes?.toLocaleString() || 10000} min`} />
                <InfoRow label="Current Monthly Minutes" value={`${latestUsage?.total_minutes_all_clients?.toLocaleString() || 0} min`} />
                {pricing?.volume_discount_min_minutes && latestUsage?.total_minutes_all_clients && (
                  <div className="pt-2">
                    <div className="text-sm text-muted-foreground mb-1">
                      Progress: {Math.min(100, Math.round((latestUsage.total_minutes_all_clients / pricing.volume_discount_min_minutes) * 100))}%
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (latestUsage.total_minutes_all_clients / pricing.volume_discount_min_minutes) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <PartnerFulfillmentMiniTable partnerId={id!} />
        </TabsContent>

        {/* Wholesale Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          {pricing ? (
            <PricingEditor pricing={pricing} onSave={(updates) => savePricingMutation.mutate(updates)} saving={savePricingMutation.isPending} />
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pricing configured for this partner.</CardContent></Card>
          )}
        </TabsContent>

        {/* Add-on Pricing Tab */}
        <TabsContent value="addons" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Add-on Product Pricing</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Default Price</TableHead>
                    <TableHead>Wholesale Price</TableHead>
                    <TableHead>Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addonProducts.map(product => {
                    const ap = addonPricing.find(p => p.addon_product_id === product.id);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>${product.default_price}</TableCell>
                        <TableCell>{ap ? `$${ap.wholesale_price}` : '-'}</TableCell>
                        <TableCell>{ap ? (ap.is_available ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-destructive" />) : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients & Verification Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clients ({clients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing Verified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(client => {
                    const config = serviceConfigs.find(c => c.wl_client_id === client.id);
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell>{client.service_type}</TableCell>
                        <TableCell>{client.language_support}</TableCell>
                        <TableCell>{client.num_campaigns}</TableCell>
                        <TableCell><Badge variant="outline">{client.status || 'active'}</Badge></TableCell>
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
                  {clients.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No clients yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Campaign Mappings</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Mapping</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Campaign Mapping</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>WL Client</Label>
                      <Select value={newMapping.wl_client_id} onValueChange={(v) => setNewMapping(p => ({ ...p, wl_client_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>
                          {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Five9 Campaign Name</Label>
                      <Input value={newMapping.match_value} onChange={e => setNewMapping(p => ({ ...p, match_value: e.target.value }))} placeholder="e.g. Partner_ClientA_Inbound" />
                    </div>
                    <Button onClick={() => createMappingMutation.mutate()} disabled={!newMapping.wl_client_id || !newMapping.match_value || createMappingMutation.isPending}>
                      Create Mapping
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign (match_value)</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>WL Client</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map(m => {
                    const client = clients.find(c => c.id === m.wl_client_id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.match_value}</TableCell>
                        <TableCell>{m.match_type}</TableCell>
                        <TableCell>{client?.client_name || m.wl_client_id || '-'}</TableCell>
                        <TableCell>{m.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-destructive" />}</TableCell>
                      </TableRow>
                    );
                  })}
                  {mappings.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No mappings configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage & Billing Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-heading">Usage Summaries</h3>
            <Button onClick={triggerUsageCalc} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Trigger Usage Calculation
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Active Clients</TableHead>
                    <TableHead>Total Minutes</TableHead>
                    <TableHead>Total Calls</TableHead>
                    <TableHead>Campaign Fees</TableHead>
                    <TableHead>Wholesale Cost</TableHead>
                    <TableHead>Volume Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageSummaries.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{format(new Date(u.billing_period_start), 'MMM yyyy')}</TableCell>
                      <TableCell>{u.active_client_count}</TableCell>
                      <TableCell>{u.total_minutes_all_clients.toLocaleString()}</TableCell>
                      <TableCell>{u.total_calls_all_clients.toLocaleString()}</TableCell>
                      <TableCell>${u.total_campaign_fees.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${u.total_wholesale_cost.toFixed(2)}</TableCell>
                      <TableCell>{u.volume_discount_active ? <Badge className="bg-green-500/10 text-green-600">Active</Badge> : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {usageSummaries.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No usage data yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <h3 className="text-lg font-semibold text-heading">Per-Client Usage Records</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Minutes</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Surcharges</TableHead>
                    <TableHead>Wholesale Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRecords.slice(0, 20).map(r => {
                    const client = clients.find(c => c.id === r.wl_client_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{client?.client_name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(r.billing_period_start), 'MMM yyyy')}</TableCell>
                        <TableCell>{r.total_minutes_used.toLocaleString()}</TableCell>
                        <TableCell>{r.total_calls}</TableCell>
                        <TableCell>${r.base_rate_applied.toFixed(2)}/min</TableCell>
                        <TableCell>${(r.language_surcharge_applied + r.secretary_surcharge_applied).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">${r.wholesale_cost.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {usageRecords.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No usage records</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agreements Tab */}
        <TabsContent value="agreements" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Terms & Agreements</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Signed</TableHead>
                    <TableHead>Signed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.agreement_version}</TableCell>
                      <TableCell>{a.is_current ? <Check className="w-4 h-4 text-green-500" /> : '-'}</TableCell>
                      <TableCell>{format(new Date(a.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{a.signed_at ? format(new Date(a.signed_at), 'MMM d, yyyy') : 'Unsigned'}</TableCell>
                      <TableCell>{a.signed_by || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {agreements.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No agreements</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-heading">{value}</span>
    </div>
  );
}

// Pricing Editor component
function PricingEditor({ pricing, onSave, saving }: { pricing: any; onSave: (u: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    tier_under_100_rate: pricing.tier_under_100_rate,
    tier_under_500_rate: pricing.tier_under_500_rate,
    tier_under_1000_rate: pricing.tier_under_1000_rate,
    tier_over_1000_rate: pricing.tier_over_1000_rate,
    campaign_setup_fee: pricing.campaign_setup_fee,
    additional_campaign_fee: pricing.additional_campaign_fee,
    spanish_surcharge: pricing.spanish_surcharge,
    french_surcharge: pricing.french_surcharge,
    both_languages_surcharge: pricing.both_languages_surcharge,
    secretary_surcharge: pricing.secretary_surcharge,
    volume_discount_active: pricing.volume_discount_active,
    volume_discount_fixed_rate: pricing.volume_discount_fixed_rate || 0,
    volume_discount_min_minutes: pricing.volume_discount_min_minutes,
  });

  const fields = [
    { key: 'tier_under_100_rate', label: 'Under 100 min rate', prefix: '$' },
    { key: 'tier_under_500_rate', label: 'Under 500 min rate', prefix: '$' },
    { key: 'tier_under_1000_rate', label: 'Under 1000 min rate', prefix: '$' },
    { key: 'tier_over_1000_rate', label: 'Over 1000 min rate', prefix: '$' },
    { key: 'campaign_setup_fee', label: 'Campaign Setup Fee', prefix: '$' },
    { key: 'additional_campaign_fee', label: 'Additional Campaign Fee', prefix: '$' },
    { key: 'spanish_surcharge', label: 'Spanish Surcharge', prefix: '$' },
    { key: 'french_surcharge', label: 'French Surcharge', prefix: '$' },
    { key: 'both_languages_surcharge', label: 'Both Languages Surcharge', prefix: '$' },
    { key: 'secretary_surcharge', label: 'Secretary Surcharge', prefix: '$' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Wholesale Pricing Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{f.prefix}</span>
                <Input
                  type="number"
                  step="0.01"
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="pl-7"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-semibold text-heading">Volume Discount</h4>
          <div className="flex items-center gap-3">
            <Switch checked={form.volume_discount_active} onCheckedChange={v => setForm(p => ({ ...p, volume_discount_active: v }))} />
            <Label>Volume Discount Active</Label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Fixed Rate ($/min)</Label>
              <Input type="number" step="0.01" value={form.volume_discount_fixed_rate} onChange={e => setForm(p => ({ ...p, volume_discount_fixed_rate: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Min Minutes Threshold</Label>
              <Input type="number" value={form.volume_discount_min_minutes} onChange={e => setForm(p => ({ ...p, volume_discount_min_minutes: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
        </div>

        <Button onClick={() => onSave(form)} disabled={saving}>
          {saving ? 'Saving...' : 'Save Pricing'}
        </Button>
      </CardContent>
    </Card>
  );
}
