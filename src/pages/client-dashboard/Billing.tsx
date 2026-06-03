import { useState, useEffect } from 'react';
import { CreditCard, Download, Clock, DollarSign, TrendingUp, TrendingDown, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  calculateDynamicBilling,
  formatCurrency,
  type DynamicBillingResult,
} from '@/lib/dynamicBilling';

interface UsageStats {
  minutesUsed: number;
  totalCalls: number;
  planMinutes: number;
  serviceType: string | null;
}

interface SubscriptionInfo {
  subscribed: boolean;
  plan_name: string | null;
  minutes_included: number;
  subscription_end: string | null;
  product_id: string | null;
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usage, setUsage] = useState<UsageStats>({
    minutesUsed: 0,
    totalCalls: 0,
    planMinutes: 250,
    serviceType: null,
  });
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [billingResult, setBillingResult] = useState<DynamicBillingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);

      // Get current billing period (this month)
      const now = new Date();
      const periodStart = startOfMonth(now);
      const periodEnd = endOfMonth(now);

      // Fetch usage and subscription in parallel
      const [callsResult, subscriptionResult, leadResult] = await Promise.all([
        supabase
          .from('call_logs')
          .select('handle_time_seconds')
          .eq('client_id', user.id)
          .gte('created_at', periodStart.toISOString())
          .lte('created_at', periodEnd.toISOString()),
        supabase.functions.invoke('check-subscription'),
        // Try to get lead info for service type
        supabase
          .from('leads')
          .select('service_type, plan_minutes')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      // Process call logs
      let totalMinutes = 0;
      if (!callsResult.error && callsResult.data) {
        const totalSeconds = callsResult.data.reduce((sum, call) => sum + (call.handle_time_seconds || 0), 0);
        totalMinutes = Math.ceil(totalSeconds / 60);

        setUsage(prev => ({
          ...prev,
          minutesUsed: totalMinutes,
          totalCalls: callsResult.data.length,
        }));
      }

      // Get service type from lead
      let serviceType = null;
      let planMinutes = 250;
      if (!leadResult.error && leadResult.data) {
        serviceType = leadResult.data.service_type;
        planMinutes = leadResult.data.plan_minutes || 250;
        setUsage(prev => ({
          ...prev,
          serviceType,
          planMinutes,
        }));
      }

      // Process subscription
      if (!subscriptionResult.error && subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
        if (subscriptionResult.data.minutes_included > 0) {
          planMinutes = subscriptionResult.data.minutes_included;
          setUsage(prev => ({
            ...prev,
            planMinutes: subscriptionResult.data.minutes_included,
          }));
        }
      }

      // Calculate dynamic billing if we have service type
      if (serviceType && planMinutes) {
        const result = calculateDynamicBilling(serviceType, totalMinutes, planMinutes);
        setBillingResult(result);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleUpgrade = async () => {
    window.location.href = '/pricing';
  };

  const usagePercentage = Math.min((usage.minutesUsed / usage.planMinutes) * 100, 100);
  const remainingMinutes = Math.max(usage.planMinutes - usage.minutesUsed, 0);
  const currentMonth = format(new Date(), 'MMMM yyyy');
  const nextInvoiceDate = subscription?.subscription_end 
    ? format(new Date(subscription.subscription_end), 'MMM d, yyyy')
    : format(endOfMonth(new Date()), 'MMM d, yyyy');

  // Use dynamic billing result if available, otherwise fallback to simple calculation
  const baseCost = billingResult?.breakdown.baseCost ?? (subscription?.minutes_included === 500 ? 399 : 199);
  const overageMinutes = billingResult?.breakdown.overageMinutes ?? Math.max(usage.minutesUsed - usage.planMinutes, 0);
  const overageRate = billingResult?.breakdown.overageRate ?? 1.50;
  const overageCost = billingResult?.breakdown.overageCost ?? (overageMinutes * overageRate);
  const estimatedTotal = billingResult?.breakdown.totalCost ?? (baseCost + overageCost);
  const dynamicSavings = billingResult?.savings ?? 0;

  return (
    <DashboardLayout
      title="Billing & Usage"
      description="Manage your subscription and view invoices"
    >
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : `${usage.minutesUsed} / ${usage.planMinutes}`}
                </p>
              </div>
            </div>
            <Progress value={usagePercentage} className="mt-4" />
            <p className="text-sm text-muted-foreground mt-2">
              {remainingMinutes} minutes remaining this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : usage.totalCalls}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              For {currentMonth}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Invoice</p>
                <p className="text-2xl font-bold">
                  {subscription?.subscribed ? `$${estimatedTotal.toFixed(0)}` : '$0'}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {subscription?.subscribed ? `Renews ${nextInvoiceDate}` : 'No active subscription'}
            </p>
            {overageMinutes > 0 && (
              <p className="text-xs text-destructive mt-1">
                Includes ${overageCost.toFixed(2)} overage charges
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscription?.subscribed ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold">{subscription.plan_name}</p>
                  <Badge variant="secondary" className="bg-cta/10 text-cta">Active</Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatCurrency(baseCost)}/month • Billed monthly
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Overage rate: {formatCurrency(overageRate)}/minute
                </p>
                {dynamicSavings > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-green-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Saving {formatCurrency(dynamicSavings)} with dynamic billing!
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleUpgrade}>
                  Upgrade Plan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                >
                  {isLoadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-muted-foreground">No Active Plan</p>
                <p className="text-muted-foreground">
                  Subscribe to start using our answering services
                </p>
              </div>
              <Button variant="cta" onClick={handleUpgrade}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method - Only show if subscribed */}
      {subscription?.subscribed && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Managed by Stripe</p>
                  <p className="text-sm text-muted-foreground">Click "Manage Billing" to update</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription?.subscribed ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Invoices are managed by Stripe</p>
              <Button 
                variant="link" 
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="mt-2"
              >
                View in Billing Portal
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No invoices yet</p>
              <p className="text-sm">Subscribe to a plan to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
