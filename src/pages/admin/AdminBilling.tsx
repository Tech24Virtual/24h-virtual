import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  CreditCard,
  Users,
  ExternalLink,
  Package,
  Settings2,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { CustomPlanBuilder } from '@/components/admin/CustomPlanBuilder';
import { ActiveSubscriptionsList } from '@/components/admin/ActiveSubscriptionsList';
import { AddOnsSummary } from '@/components/admin/AddOnsSummary';
import { PaymentFailures } from '@/components/admin/PaymentFailures';
import { CallImportsTab } from '@/components/admin/CallImportsTab';
import { CreateClientDialog } from '@/components/admin/CreateClientDialog';

export default function AdminBilling() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomPlanDialog, setShowCustomPlanDialog] = useState(false);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);

  // Active clients — NMI clients don't have stripe_subscription_id; filter by pipeline stage
  const { data: subscriptionStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['subscription-stats'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, service_type, plan_minutes, payment_processor')
        .eq('pipeline_stage', 'active');

      if (error) throw error;

      return {
        activeClients: leads?.length || 0,
      };
    },
  });

  // Fetch payment failures count
  const { data: failuresCount, error: failuresCountError } = useQuery({
    queryKey: ['payment-failures-count'],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payment_failures')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null);

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch custom plans
  const { data: customPlans, isLoading: customPlansLoading, error: customPlansError } = useQuery({
    queryKey: ['custom-plans'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_plans')
        .select(`
          *,
          leads:lead_id (name, email, company)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch client add-ons summary
  const { data: addOnsSummary, isLoading: addOnsLoading, error: addOnsError } = useQuery({
    queryKey: ['addons-summary'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_addons')
        .select('addon_slug, addon_name, price, quantity')
        .eq('is_active', true);

      if (error) throw error;

      const summary: Record<string, { count: number; revenue: number; name: string }> = {};
      data?.forEach(addon => {
        if (!summary[addon.addon_slug]) {
          summary[addon.addon_slug] = { count: 0, revenue: 0, name: addon.addon_name };
        }
        summary[addon.addon_slug].count += addon.quantity || 1;
        summary[addon.addon_slug].revenue += (addon.price || 0) * (addon.quantity || 1);
      });

      return Object.entries(summary).map(([slug, data]) => ({
        slug,
        name: data.name,
        count: data.count,
        revenue: data.revenue,
      }));
    },
  });

  const totalAddOnRevenue = addOnsSummary?.reduce((sum, a) => sum + a.revenue, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Billing Management</h1>
            <p className="text-muted-foreground mt-1">Manage subscriptions, add-ons, and custom plans</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowCreateClientDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Client
            </Button>
            <Button onClick={() => setShowCustomPlanDialog(true)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Create Custom Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsError ? (
              <div className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Failed to load</span>
              </div>
            ) : statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{subscriptionStats?.activeClients || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Add-On Revenue</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {addOnsError ? (
              <div className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Failed to load</span>
              </div>
            ) : addOnsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">${totalAddOnRevenue.toLocaleString()}/mo</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Plans</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {customPlansError ? (
              <div className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Failed to load</span>
              </div>
            ) : customPlansLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{customPlans?.length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {failuresCountError ? (
              <div className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Failed to load</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{failuresCount || 0}</div>
                <p className="text-xs text-muted-foreground">Requiring attention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payment-issues" className="flex items-center gap-2">
            Payment Issues
            {failuresCount && failuresCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                {failuresCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="addons">Add-Ons</TabsTrigger>
          <TabsTrigger value="custom-plans">Custom Plans</TabsTrigger>
          <TabsTrigger value="call-imports">Call Imports</TabsTrigger>
          <TabsTrigger value="nmi-payment">NMI Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <ActiveSubscriptionsList searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </TabsContent>

        <TabsContent value="payment-issues" className="space-y-4">
          <PaymentFailures />
        </TabsContent>

        <TabsContent value="addons" className="space-y-4">
          <AddOnsSummary data={addOnsSummary || []} isLoading={addOnsLoading} />
        </TabsContent>

        <TabsContent value="custom-plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Pricing Plans</CardTitle>
              <CardDescription>
                Special pricing arrangements for specific clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customPlansLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : customPlansError ? (
                <div className="text-center py-8 text-destructive/80">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-60" />
                  <p className="font-medium">Failed to load custom plans</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verify <code className="font-mono">GRANT SELECT ON public.custom_plans</code> is applied.
                  </p>
                </div>
              ) : customPlans?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom plans configured</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCustomPlanDialog(true)}
                  >
                    Create First Custom Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {customPlans?.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{plan.plan_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(plan.leads as { name: string; email: string } | null)?.name || 'Unknown'} -{' '}
                          {(plan.leads as { name: string; email: string } | null)?.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={plan.plan_type === 'per_minute' ? 'default' : 'secondary'}>
                            {plan.plan_type}
                          </Badge>
                          {plan.minute_rate && (
                            <div className="text-sm font-medium mt-1">${plan.minute_rate.toFixed(2)}/min</div>
                          )}
                          {plan.fixed_amount && (
                            <div className="text-sm font-medium mt-1">${plan.fixed_amount.toFixed(2)}/mo</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="call-imports" className="space-y-4">
          <CallImportsTab />
        </TabsContent>

        <TabsContent value="nmi-payment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  NMI Payment Gateway
                </CardTitle>
                <CardDescription>
                  Active payment processor for 24H Virtual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-cta flex-shrink-0" />
                  <span className="font-medium">NMI is the active payment processor</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Client billing is managed through the NMI merchant portal. Use the portal
                  to add cards, update billing details, manage Customer Vault entries, and
                  view transaction history.
                </p>
                <Button onClick={() => window.open('https://secure.nmi.com', '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open NMI Portal
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adding a Client Card</CardTitle>
                <CardDescription>
                  How to add or update a payment method via NMI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2.5 text-sm text-muted-foreground">
                  {[
                    'Log in to the NMI merchant portal at secure.nmi.com',
                    'Navigate to Customer Vault in the left menu',
                    'Search for the client by name or email address',
                    'Select the client record and click "Add Payment Method"',
                    'Enter card details and save — the vault ID updates automatically',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CustomPlanBuilder
        open={showCustomPlanDialog}
        onOpenChange={setShowCustomPlanDialog}
      />

      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
      />
    </div>
  );
}
