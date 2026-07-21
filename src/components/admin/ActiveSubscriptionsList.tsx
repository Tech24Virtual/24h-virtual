import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, AlertTriangle, Lock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { servicePricingMap } from '@/lib/pricingData';
import { useAuth } from '@/contexts/AuthContext';
import { ClientBillingSheet } from '@/components/admin/ClientBillingSheet';
import type { Tables } from '@/integrations/supabase/types';

type BillingPlan = Tables<'billing_plans'>;

interface ActiveSubscriptionsListProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const NO_PLAN = '__none__';

export function ActiveSubscriptionsList({ searchTerm, onSearchChange }: ActiveSubscriptionsListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['active-subscriptions', searchTerm],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, name, email, company, service_type, plan_minutes, pipeline_stage, payment_processor, nmi_card_last_four, nmi_card_type, current_plan_id, plan_override, billing_plans(id, name)')
        .eq('pipeline_stage', 'active')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['billing-plans'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .order('fixed_amount', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as BillingPlan[];
    },
  });

  const changePlan = useMutation({
    mutationFn: async ({ leadId, planId }: { leadId: string; planId: string | null }) => {
      const { error } = await supabase
        .from('leads')
        .update({
          current_plan_id: planId,
          plan_override: true,
          plan_override_by: user?.id ?? null,
          plan_override_at: new Date().toISOString(),
        })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan updated', { description: 'Locked — the monthly auto-adjust cron will skip this client.' });
      queryClient.invalidateQueries({ queryKey: ['active-subscriptions'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to change plan');
    },
  });

  const getServiceName = (slug: string | null): string => {
    if (!slug) return 'Unknown Service';
    const service = servicePricingMap[slug];
    return service?.name || slug;
  };

  const getEstimatedPrice = (serviceType: string | null, minutes: number | null): string => {
    if (!serviceType || !minutes) return '-';
    const service = servicePricingMap[serviceType];
    if (!service) return '-';
    const tier = service.tiers.find(t => t.minutes === minutes);
    return tier?.priceFormatted || '-';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Clients</CardTitle>
        <CardDescription>All clients with pipeline stage: active</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive/80">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="font-medium text-sm">Failed to load active clients</p>
            <p className="text-xs text-muted-foreground mt-1">Check Supabase grants for the leads table.</p>
          </div>
        ) : subscriptions?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No clients match your search' : 'No active clients'}
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions?.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-y-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1 max-w-[240px]">
                  <div className="font-medium truncate">{lead.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {lead.email}
                    {lead.company && ` • ${lead.company}`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 ml-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium">
                      {getServiceName(lead.service_type)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lead.plan_minutes ? `${lead.plan_minutes} min` : '-'} •{' '}
                      {getEstimatedPrice(lead.service_type, lead.plan_minutes)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={lead.plan_override ? 'outline' : 'secondary'} className="gap-1">
                      {lead.plan_override ? <Lock className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                      {lead.plan_override ? 'Locked' : 'Auto'}
                    </Badge>
                    <Select
                      value={lead.current_plan_id ?? NO_PLAN}
                      onValueChange={(v) =>
                        changePlan.mutate({ leadId: lead.id, planId: v === NO_PLAN ? null : v })
                      }
                    >
                      <SelectTrigger className="h-7 w-40 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="No plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PLAN}>No plan</SelectItem>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="capitalize">
                      {(lead.payment_processor as string | null) ?? 'nmi'}
                    </Badge>
                    {lead.nmi_card_last_four && (
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        ···{lead.nmi_card_last_four}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedClientId(lead.id)}
                      title="View Client"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ClientBillingSheet
        clientId={selectedClientId}
        open={!!selectedClientId}
        onOpenChange={(nextOpen) => !nextOpen && setSelectedClientId(null)}
      />
    </Card>
  );
}
