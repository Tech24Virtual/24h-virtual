import { useQuery } from '@tanstack/react-query';
import { CreditCard, MessageSquare, AlertTriangle, CheckCircle, DollarSign, Users, TrendingUp, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RunBillingButton } from '@/components/missions/RunBillingButton';
import { MissionsList } from '@/components/missions/MissionsList';

export default function BillingDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['billing-dashboard-stats'],
    queryFn: async () => {
      const [ticketsResult, failuresResult, commissionsResult, subscriptionsResult, wlUnverifiedResult] = await Promise.all([
        supabase.from('support_tickets').select('id, status, source', { count: 'exact' }).eq('category', 'billing'),
        supabase.from('payment_failures').select('id, resolved_at', { count: 'exact' }),
        supabase.from('sales_commissions').select('id, status, commission_amount'),
        supabase.from('leads').select('id', { count: 'exact' }).eq('pipeline_stage', 'active'),
        supabase.from('wl_client_service_config').select('id', { count: 'exact' }).eq('billing_verified', false),
      ]);

      const tickets = ticketsResult.data || [];
      const failures = failuresResult.data || [];
      const commissions = commissionsResult.data || [];

      return {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        paymentFailures: failures.filter(f => !f.resolved_at).length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        pendingCommissions: commissions.filter((c: any) => c.status === 'pending').length,
        activeSubscriptions: subscriptionsResult.data?.length || 0,
        wlUnverified: wlUnverifiedResult.count || 0,
      };
    },
  });

  const StatCard = ({ title, value, icon: Icon, color, loading }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing Dashboard</h1>
          <p className="text-muted-foreground">Manage billing inquiries, payments, and commissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Billing Tickets" value={stats?.totalTickets || 0} icon={MessageSquare} color="text-blue-500" loading={isLoading} />
          <StatCard title="Open Tickets" value={stats?.openTickets || 0} icon={CreditCard} color="text-orange-500" loading={isLoading} />
          <StatCard title="Payment Failures" value={stats?.paymentFailures || 0} icon={AlertTriangle} color="text-destructive" loading={isLoading} />
          <StatCard title="Pending Commissions" value={stats?.pendingCommissions || 0} icon={DollarSign} color="text-primary" loading={isLoading} />
          <StatCard title="Active Subscriptions" value={stats?.activeSubscriptions || 0} icon={Users} color="text-primary" loading={isLoading} />
          <StatCard title="Resolved" value={stats?.resolvedTickets || 0} icon={CheckCircle} color="text-green-500" loading={isLoading} />
          <StatCard title="WL Unverified" value={stats?.wlUnverified || 0} icon={Building2} color="text-orange-500" loading={isLoading} />
        </div>

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
