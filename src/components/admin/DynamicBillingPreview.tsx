import { useState, useEffect } from 'react';
import { Calculator, TrendingDown, CheckCircle, Loader2, RefreshCw, DollarSign, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  calculateDynamicBilling,
  formatCurrency,
  type DynamicBillingResult,
  ANNUAL_DISCOUNT_RATE,
} from '@/lib/dynamicBilling';
import { isEligibleForDynamicBilling, getServiceBySlug } from '@/lib/pricingData';

interface DynamicBillingPreviewProps {
  leadId: string;
  serviceType: string | null;
  planMinutes: number | null;
  dynamicBillingEnabled?: boolean;
  billingPeriod?: string | null;
  billingCurrency?: string | null;
}

const serviceLabels: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

export function DynamicBillingPreview({
  leadId,
  serviceType,
  planMinutes,
  dynamicBillingEnabled = true,
  billingPeriod,
  billingCurrency,
}: DynamicBillingPreviewProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [billingResult, setBillingResult] = useState<DynamicBillingResult | null>(null);

  const isAnnual = billingPeriod === 'annual';
  const currency = billingCurrency || 'usd';

  // Check eligibility
  const isEligible = serviceType ? isEligibleForDynamicBilling(serviceType) : false;

  // Fetch usage data
  const fetchUsage = async () => {
    if (!leadId || !serviceType || !planMinutes) return;

    setIsLoading(true);
    try {
      // Get current month's billing period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Fetch call logs for this lead
      const { data: callLogs, error } = await supabase
        .from('call_logs')
        .select('call_duration')
        .eq('client_id', leadId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (error) {
        console.error('Error fetching call logs:', error);
        // Continue with 0 minutes if no call logs
      }

      const totalSeconds = callLogs?.reduce((sum, log) => sum + (log.call_duration || 0), 0) || 0;
      const minutes = Math.ceil(totalSeconds / 60);
      setMinutesUsed(minutes);

      // Calculate dynamic billing (pass isAnnual for proper calculations)
      const result = calculateDynamicBilling(serviceType, minutes, planMinutes, isAnnual);
      setBillingResult(result);
    } catch (err) {
      console.error('Error calculating billing:', err);
      toast({
        title: 'Error',
        description: 'Failed to calculate billing preview',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [leadId, serviceType, planMinutes]);

  // Not eligible for dynamic billing
  if (!isEligible) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Dynamic Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {!serviceType 
              ? 'No service selected. Dynamic billing requires a service plan.'
              : `${serviceLabels[serviceType] || serviceType} is not eligible for dynamic billing.`
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  // Missing plan information
  if (!planMinutes) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Dynamic Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No plan minutes selected. Please select a plan tier to see billing preview.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Dynamic Billing Preview
            </CardTitle>
            <CardDescription>
              {serviceLabels[serviceType] || serviceType} (isolated)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {dynamicBillingEnabled ? (
              <Badge variant="secondary" className="bg-cta/10 text-cta">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
            {isAnnual && (
              <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                <Tag className="h-3 w-3 mr-1" />
                Annual
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchUsage}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : billingResult ? (
          <>
            {/* Usage meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Minutes Used</span>
                <span className="font-medium">{minutesUsed.toLocaleString()} min</span>
              </div>
              <Progress 
                value={Math.min((minutesUsed / billingResult.originalTier.minutes) * 100, 100)} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Original Plan: {billingResult.originalTier.minutes} min @ {formatCurrency(billingResult.originalTier.price, currency)}/mo</span>
              </div>
            </div>

            {/* Annual Discount Highlight */}
            {isAnnual && billingResult.breakdown.annualDiscount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-secondary" />
                  <span className="font-medium text-secondary">
                    Annual Discount Applied
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-secondary">
                    -{formatCurrency(billingResult.breakdown.annualDiscount, currency)}
                  </span>
                  <span className="text-sm text-secondary ml-1">
                    (10%)
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Billing comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Static billing */}
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Static Billing
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base:</span>
                    <span>{formatCurrency(billingResult.staticBilling.baseCost, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overage:</span>
                    <span>
                      {billingResult.staticBilling.overageMinutes} × {formatCurrency(billingResult.breakdown.overageRate, currency)} = {formatCurrency(billingResult.staticBilling.overageCost, currency)}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatCurrency(billingResult.staticBilling.totalCost, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic billing */}
              <div className="space-y-2 p-3 rounded-lg bg-cta/5 border border-cta/20">
                <p className="text-xs font-medium text-cta uppercase tracking-wide">
                  Dynamic Billing
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Optimal Tier:</span>
                    <span>{billingResult.optimalTier.minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base:</span>
                    <span>{formatCurrency(billingResult.breakdown.baseCost, currency)}</span>
                  </div>
                  {isAnnual && billingResult.breakdown.annualDiscount > 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>Annual Discount:</span>
                      <span>-{formatCurrency(billingResult.breakdown.annualDiscount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Overage:</span>
                    <span>
                      {billingResult.breakdown.overageMinutes} × {formatCurrency(billingResult.breakdown.overageRate, currency)} = {formatCurrency(billingResult.breakdown.overageCost, currency)}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-medium text-cta">
                    <span>Total:</span>
                    <span>{formatCurrency(billingResult.breakdown.totalCost, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings highlight */}
            {billingResult.savings > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    Client Saves
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(billingResult.savings, currency)}
                  </span>
                  <span className="text-sm text-green-600 ml-1">
                    ({billingResult.savingsPercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}

            {billingResult.savings === 0 && (
              <div className="flex items-center justify-center p-3 rounded-lg bg-muted/50 text-muted-foreground text-sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Current tier is already optimal for this usage
              </div>
            )}

            {/* Service isolation badge */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tiers Evaluated: {billingResult.tiersEvaluated}</span>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Service Isolated
              </Badge>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unable to calculate billing preview</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
