import { useState, useEffect } from 'react';
import { Clock, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function WLPortalBilling() {
  const { clientInfo } = useWLPortal();
  const [usage, setUsage] = useState({ minutesUsed: 0, totalCalls: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clientInfo) return;
    const fetch = async () => {
      setIsLoading(true);
      const now = new Date();
      const periodStart = startOfMonth(now);
      const periodEnd = endOfMonth(now);

      const { data } = await supabase
        .from('wl_usage_records')
        .select('*')
        .eq('wl_client_id', clientInfo.id)
        .gte('billing_period_start', format(periodStart, 'yyyy-MM-dd'))
        .lte('billing_period_end', format(periodEnd, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const record = data[0];
        setUsage({
          minutesUsed: Number(record.total_minutes_used) || 0,
          totalCalls: record.total_calls || 0,
        });
      }
      setIsLoading(false);
    };
    fetch();
  }, [clientInfo]);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <WLPortalLayout title="Usage & Billing" description="View your usage for the current period">
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : usage.minutesUsed}</p>
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
                <p className="text-2xl font-bold">{isLoading ? '...' : usage.totalCalls}</p>
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
                <p className="text-sm text-muted-foreground">Billing</p>
                <p className="text-lg font-medium text-muted-foreground">Contact your provider</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              For billing inquiries, please reach out to your service provider.
            </p>
          </CardContent>
        </Card>
      </div>
    </WLPortalLayout>
  );
}
