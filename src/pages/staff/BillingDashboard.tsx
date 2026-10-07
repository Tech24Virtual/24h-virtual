import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Building2, CalendarDays, DollarSign, Hourglass, TrendingUp, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RunBillingButton } from '@/components/missions/RunBillingButton';
import { MissionsList } from '@/components/missions/MissionsList';
import { RevenueTrendChart, type TrendPoint } from '@/components/billing/RevenueTrendChart';
import { formatMoney } from '@/lib/billing/pricing';

interface BillingOverview {
  active_clients: number;
  active_clients_priced: number;
  mrr: number;
  ytd_paid: number;
  outstanding: number;
  wl_revenue_month: number;
  unresolved_failures: number;
  wl_partners: number;
  monthly_trend: TrendPoint[];
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
  to?: string;
}

function StatCard({ title, value, hint, icon: Icon, color, loading, to }: StatCardProps) {
  const card = (
    <Card className={to ? 'hover:bg-accent/40 transition-colors h-full' : 'h-full'}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
        {hint && !loading && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block">{card}</Link> : card;
}

export default function BillingDashboard() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: async (): Promise<BillingOverview> => {
      const { data, error } = await supabase.rpc('billing_overview');
      if (error) throw error;
      return data as unknown as BillingOverview;
    },
  });

  const o = overview;
  const money = (n: number | undefined) => formatMoney(n ?? 0);

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing Dashboard</h1>
          <p className="text-muted-foreground">Financial health, payments, and commissions</p>
        </div>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              Could not load the financial overview: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="MRR"
            value={money(o?.mrr)}
            hint={o ? `${o.active_clients_priced} of ${o.active_clients} active clients have a priced plan` : undefined}
            icon={DollarSign} color="text-primary" loading={isLoading}
          />
          <StatCard title="ARR (run rate)" value={money((o?.mrr ?? 0) * 12)} hint="MRR × 12" icon={TrendingUp} color="text-primary" loading={isLoading} />
          <StatCard
            title="YTD Revenue"
            value={money(o?.ytd_paid)}
            hint="Paid overage from billing runs this year"
            icon={Wallet} color="text-green-600" loading={isLoading}
          />
          <StatCard
            title="WL Revenue This Month"
            value={money(o?.wl_revenue_month)}
            hint="Partner retail revenue from WL usage"
            icon={CalendarDays} color="text-green-600" loading={isLoading}
          />
          <StatCard
            title="Outstanding Balance"
            value={money(o?.outstanding)}
            hint="Unpaid billing-run overage"
            icon={Hourglass} color="text-orange-500" loading={isLoading}
          />
          <StatCard
            title="Payment Failures"
            value={o?.unresolved_failures ?? 0}
            hint="Unresolved — click to review"
            icon={AlertTriangle} color="text-destructive" loading={isLoading}
            to="/staff/billing/payment-issues"
          />
          <StatCard title="Active Clients" value={o?.active_clients ?? 0} icon={Users} color="text-primary" loading={isLoading} to="/staff/billing/client-lookup" />
          <StatCard title="WL Partners" value={o?.wl_partners ?? 0} icon={Building2} color="text-primary" loading={isLoading} to="/staff/billing/wl-partners" />
        </div>

        <RevenueTrendChart data={o?.monthly_trend ?? []} />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <RunBillingButton />
          <Button asChild variant="outline"><Link to="/staff/billing/payment-issues">Resolve Payments</Link></Button>
          <Button asChild variant="outline"><Link to="/staff/billing/commissions">Review Commissions</Link></Button>
          <Button asChild variant="outline"><Link to="/staff/billing/client-lookup">Lookup Client</Link></Button>
          <Button asChild variant="outline"><Link to="/staff/billing/subscriptions">View Subscriptions</Link></Button>
          <Button asChild variant="outline"><Link to="/staff/billing/wl-partners">WL Partners</Link></Button>
        </div>

        <MissionsList title="Recent Billing Runs" missionTypeFilter="call_billing" limit={5} />

        <TicketList
          title="Billing Tickets"
          workQueueFilter="billing"
          showSourceBadge={true}
          linkPrefix="/staff/billing/tickets"
        />
      </div>
    </StaffLayout>
  );
}
