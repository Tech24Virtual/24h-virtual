import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  recurringAddOns, 
  oneTimeAddOns, 
  emailAddOns,
  formatAddOnPrice,
  type AddOnProduct
} from '@/lib/addOnsPricing';
import { CreditCard, Plus, Loader2 } from 'lucide-react';

interface ClientBillingItemsManagerProps {
  leadId: string;
  basePlan?: {
    serviceName: string;
    minutes: number;
    price: number;
  };
}

export function ClientBillingItemsManager({ leadId, basePlan }: ClientBillingItemsManagerProps) {
  const [processingSlug, setProcessingSlug] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch active add-ons for this client
  const { data: activeAddOns, isLoading } = useQuery({
    queryKey: ['client-addons', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_addons')
        .select('*')
        .eq('lead_id', leadId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
  });

  const isAddonActive = (slug: string): boolean => {
    return activeAddOns?.some(a => a.addon_slug === slug) || false;
  };

  const getActiveAddon = (slug: string) => {
    return activeAddOns?.find(a => a.addon_slug === slug);
  };

  // Toggle add-on mutation
  const toggleAddon = useMutation({
    mutationFn: async ({ addon, enable }: { addon: AddOnProduct; enable: boolean }) => {
      setProcessingSlug(addon.slug);
      
      const { data, error } = await supabase.functions.invoke('manage-subscription-addons', {
        body: {
          action: enable ? 'add' : 'remove',
          leadId,
          addonSlug: addon.slug,
          addonName: addon.name,
          price: addon.price,
          billingType: addon.billingType,
          stripePriceId: addon.stripePriceId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { addon, enable }) => {
      toast({
        title: enable ? 'Add-on enabled' : 'Add-on disabled',
        description: `${addon.name} has been ${enable ? 'added to' : 'removed from'} billing`,
      });
      queryClient.invalidateQueries({ queryKey: ['client-addons', leadId] });
    },
    onError: (error, { addon }) => {
      toast({
        title: 'Failed to update add-on',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setProcessingSlug(null);
    },
  });

  // Charge one-time add-on
  const chargeOneTime = useMutation({
    mutationFn: async (addon: AddOnProduct) => {
      setProcessingSlug(addon.slug);
      
      const { data, error } = await supabase.functions.invoke('manage-subscription-addons', {
        body: {
          action: 'charge',
          leadId,
          addonSlug: addon.slug,
          addonName: addon.name,
          price: addon.price,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, addon) => {
      toast({
        title: 'One-time charge created',
        description: `${addon.name} - $${addon.price.toFixed(2)} has been invoiced`,
      });
      queryClient.invalidateQueries({ queryKey: ['client-addons', leadId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create charge',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setProcessingSlug(null);
    },
  });

  // Calculate totals
  const monthlyAddOnsTotal = activeAddOns?.reduce((sum, a) => {
    if (a.billing_type === 'recurring') {
      return sum + ((a.price || 0) * (a.quantity || 1));
    }
    return sum;
  }, 0) || 0;

  const totalMonthly = (basePlan?.price || 0) + monthlyAddOnsTotal;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing Items
        </CardTitle>
        <CardDescription>
          Toggle add-ons on/off to update client billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Plan */}
        {basePlan && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Base Plan</div>
                <div className="text-sm text-muted-foreground">
                  {basePlan.serviceName} - {basePlan.minutes} min
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">${basePlan.price.toFixed(2)}/mo</div>
                <Badge variant="default" className="mt-1">Active</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Add-Ons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">RECURRING ADD-ONS</h4>
          {[...recurringAddOns, ...emailAddOns].map((addon) => {
            const isActive = isAddonActive(addon.slug);
            const isProcessing = processingSlug === addon.slug;
            
            return (
              <div 
                key={addon.slug}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{addon.name}</div>
                  {addon.description && (
                    <div className="text-xs text-muted-foreground">{addon.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium min-w-[70px] text-right">
                    {formatAddOnPrice(addon)}
                  </span>
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => {
                        toggleAddon.mutate({ addon, enable: checked });
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* One-Time Charges */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">ONE-TIME CHARGES</h4>
          {oneTimeAddOns.map((addon) => {
            const isProcessing = processingSlug === addon.slug;
            
            return (
              <div 
                key={addon.slug}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{addon.name}</div>
                  {addon.description && (
                    <div className="text-xs text-muted-foreground">{addon.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {formatAddOnPrice(addon)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => chargeOneTime.mutate(addon)}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Charge'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Monthly Totals */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Plan:</span>
            <span>${(basePlan?.price || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Active Add-Ons ({activeAddOns?.filter(a => a.billing_type === 'recurring').length || 0}):</span>
            <span>${monthlyAddOnsTotal.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total Monthly:</span>
            <span>${totalMonthly.toFixed(2)}/mo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
