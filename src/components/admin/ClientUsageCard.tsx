import { useQuery } from "@tanstack/react-query";
import { Clock, Phone, TrendingUp, DollarSign, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";
import {
  formatSecondsToReadable,
  calculateCallStats,
} from "@/lib/callDataParser";
import { getServiceBySlug } from "@/lib/pricingData";

interface ClientUsageCardProps {
  leadId: string;
  serviceType?: string | null;
  planMinutes?: number | null;
  billingCurrency?: string | null;
  billingPeriod?: string | null;
  onViewDetails?: () => void;
}

// Overage rates by service type
const overageRates: Record<string, number> = {
  "ai-receptionist": 0.75,
  "message-assistant": 1.75,
  "virtual-receptionist": 2.0,
  "virtual-secretary": 2.5,
};

export function ClientUsageCard({
  leadId,
  serviceType,
  planMinutes,
  billingCurrency,
  billingPeriod,
  onViewDetails,
}: ClientUsageCardProps) {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  // Currency formatting helper
  const formatCurrency = (amount: number) => {
    const symbol = billingCurrency === 'cad' ? 'C$' : '$';
    return `${symbol}${amount.toFixed(0)}`;
  };

  const isAnnual = billingPeriod === 'annual';
  const ANNUAL_DISCOUNT_RATE = 0.10;

  const { data: usage, isLoading } = useQuery({
    queryKey: ["client-usage", leadId, periodStart.toISOString()],
    queryFn: async () => {
      const { data: callLogs, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("client_id", leadId)
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString());

      if (error) throw error;

      // Calculate stats using the utility function
      const stats = calculateCallStats(
        callLogs?.map((log) => ({
          talk_time_seconds: log.talk_time_seconds,
          acw_seconds: log.acw_seconds,
          handle_time_seconds: log.handle_time_seconds,
          billable_minutes: log.billable_minutes,
        })) || []
      );

      // Calculate estimated cost
      const includedMinutes = planMinutes || 250;
      const overageMinutes = Math.max(0, stats.totalBillableMinutes - includedMinutes);
      const overageRate = serviceType ? overageRates[serviceType] || 2.0 : 2.0;
      const overageCost = overageMinutes * overageRate;

      return {
        ...stats,
        includedMinutes,
        overageMinutes,
        overageCost,
        usagePercentage: Math.round((stats.totalBillableMinutes / includedMinutes) * 100),
      };
    },
    enabled: !!leadId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Month Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOverage = (usage?.usagePercentage || 0) > 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {format(now, "MMMM yyyy")} Usage
        </CardTitle>
        <CardDescription>
          Current billing period activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Phone className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{usage?.totalCalls || 0}</p>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{usage?.totalBillableMinutes || 0}</p>
            <p className="text-xs text-muted-foreground">Billable Min</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">
              ${((usage?.overageCost || 0)).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Overage</p>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {usage?.totalBillableMinutes || 0} / {usage?.includedMinutes || 0} min
            </span>
            <Badge variant={isOverage ? "destructive" : "secondary"}>
              {usage?.usagePercentage || 0}%
            </Badge>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isOverage ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${Math.min(usage?.usagePercentage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Time Breakdown */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Talk Time</span>
            <span>{formatSecondsToReadable(usage?.totalTalkTimeSeconds || 0)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>After-Call Work</span>
            <span>{formatSecondsToReadable(usage?.totalAcwSeconds || 0)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total Handle Time</span>
            <span>{formatSecondsToReadable(usage?.totalHandleTimeSeconds || 0)}</span>
          </div>
        </div>

        {/* Annual Savings Display */}
        {isAnnual && serviceType && planMinutes && (
          <AnnualSavingsCard 
            serviceType={serviceType} 
            planMinutes={planMinutes} 
            billingCurrency={billingCurrency}
          />
        )}

        {/* Overage Alert */}
        {isOverage && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm font-medium text-destructive">
              {usage?.overageMinutes} minutes over plan
            </p>
            <p className="text-xs text-destructive/80">
              Additional charges: {formatCurrency(usage?.overageCost || 0)}
            </p>
          </div>
        )}

        {onViewDetails && (
          <Button variant="outline" className="w-full" onClick={onViewDetails}>
            View Call Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-component for annual savings display
function AnnualSavingsCard({ 
  serviceType, 
  planMinutes,
  billingCurrency 
}: { 
  serviceType: string; 
  planMinutes: number;
  billingCurrency?: string | null;
}) {
  const service = getServiceBySlug(serviceType);
  const tier = service?.tiers.find(t => t.minutes === planMinutes);
  
  if (!tier) return null;

  const ANNUAL_DISCOUNT_RATE = 0.10;
  const basePrice = tier.price;
  const discountAmount = basePrice * ANNUAL_DISCOUNT_RATE;
  const discountedPrice = basePrice - discountAmount;
  const currencySymbol = billingCurrency === 'cad' ? 'C$' : '$';

  return (
    <div className="p-3 rounded-lg bg-cta/5 border border-cta/20">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-cta" />
        <span className="text-sm font-semibold text-cta">Annual Plan Savings</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base Plan:</span>
          <span>
            {currencySymbol}{discountedPrice.toFixed(0)}/mo
            <span className="text-muted-foreground line-through ml-2 text-xs">
              {currencySymbol}{basePrice}
            </span>
          </span>
        </div>
        <div className="flex justify-between text-cta font-medium">
          <span>You save:</span>
          <span>{currencySymbol}{discountAmount.toFixed(0)}/mo</span>
        </div>
      </div>
    </div>
  );
}
