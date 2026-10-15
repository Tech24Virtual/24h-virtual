import { useState, useEffect } from 'react';
import { Clock, TrendingUp, DollarSign, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { fetchAllWLCallLogs } from '@/hooks/useWLCallLogsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PlanInfo {
  plan: string | null;
  monthly_value: number | null;
  overage_fee_per_minute: number | null;
}

const formatPlanName = (plan: string | null) =>
  plan ? plan.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Custom plan';

export default function WLPortalBilling() {
  const { clientInfo, branding } = useWLPortal();
  const [usage, setUsage] = useState({ minutesUsed: 0, totalCalls: 0 });
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const providerName = branding?.company_name || 'your provider';

  useEffect(() => {
    if (!clientInfo) return;
    const load = async () => {
      setIsLoading(true);
      try {
        // Usage comes straight from this month's calls (by call_date, paged past the
        // 1000-row cap) so it matches the dashboard rather than waiting on a usage rollup.
        const [monthCalls, { data: plan }] = await Promise.all([
          fetchAllWLCallLogs(clientInfo.id, format(new Date(), 'yyyy-MM-01')),
          supabase
            .from('white_label_clients')
            .select('plan, monthly_value, overage_fee_per_minute')
            .eq('id', clientInfo.id)
            .maybeSingle(),
        ]);
        const seconds = monthCalls.reduce((sum, c) => sum + (c.handle_time_seconds || 0), 0);
        setUsage({ minutesUsed: Math.round(seconds / 60), totalCalls: monthCalls.length });
        if (plan) {
          setPlanInfo({
            plan: plan.plan ?? null,
            monthly_value: plan.monthly_value != null ? Number(plan.monthly_value) : null,
            overage_fee_per_minute: plan.overage_fee_per_minute != null ? Number(plan.overage_fee_per_minute) : null,
          });
        }
      } catch (error) {
        console.error('Error loading billing:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [clientInfo]);

  const currentMonth = format(new Date(), 'MMMM yyyy');
  const monthly = planInfo?.monthly_value;
  const overage = planInfo?.overage_fee_per_minute;

  return (
    <WLPortalLayout title="Usage & Billing" description="View your usage and plan for the current period">
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : usage.minutesUsed.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">For {currentMonth}</p>
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
                <p className="text-2xl font-bold">{isLoading ? '...' : usage.totalCalls.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">For {currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-lg font-semibold">
                  {isLoading ? '...' : formatPlanName(planInfo?.plan ?? null)}
                </p>
              </div>
            </div>
            {!isLoading && (
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {monthly != null && monthly > 0 && <p>${monthly.toLocaleString(undefined, { minimumFractionDigits: 2 })} / month</p>}
                {overage != null && overage > 0 && <p>${overage.toFixed(2)} / min overage</p>}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                toast.info('Want to change your plan?', {
                  description: `Contact ${providerName} to review plan options or make changes.`,
                })
              }
            >
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Invoice history is managed by {providerName}. Contact them for billing details.
          </p>
        </CardContent>
      </Card>
    </WLPortalLayout>
  );
}
