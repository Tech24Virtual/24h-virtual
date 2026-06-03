import { useQuery } from '@tanstack/react-query';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { AgentPayoutsList } from '@/components/staff/AgentPayoutsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillingPayouts() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['payout-stats'],
    queryFn: async () => {
      const [pendingResult, paidResult, bankingResult] = await Promise.all([
        supabase.from('shift_invoices').select('id, net_hours, agent_id').eq('status', 'supervisor_approved'),
        supabase.from('shift_invoices').select('id, payout_amount').eq('status', 'paid'),
        supabase.from('agent_banking').select('agent_id, hourly_rate'),
      ]);

      const pending = pendingResult.data || [];
      const paid = paidResult.data || [];
      const bankingMap = new Map((bankingResult.data || []).map(b => [b.agent_id, b.hourly_rate]));

      const pendingAmount = pending.reduce((sum, inv) => {
        const rate = bankingMap.get(inv.agent_id) || 0;
        return sum + inv.net_hours * (rate as number);
      }, 0);

      const paidAmount = paid.reduce((sum, inv) => sum + (inv.payout_amount || 0), 0);

      return {
        pendingCount: pending.length,
        pendingAmount,
        paidCount: paid.length,
        paidAmount,
      };
    },
  });

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Agent Payouts</h1>
          <p className="text-muted-foreground">Process payouts for approved shift invoices</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div>
                  <div className="text-2xl font-bold">{stats?.pendingCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    ${(stats?.pendingAmount || 0).toFixed(2)} estimated
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processed This Period</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div>
                  <div className="text-2xl font-bold">{stats?.paidCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    ${(stats?.paidAmount || 0).toFixed(2)} paid
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold text-primary">
                  ${(stats?.pendingAmount || 0).toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Pending vs Paid */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <AgentPayoutsList statusFilter="supervisor_approved" />
          </TabsContent>
          <TabsContent value="paid" className="mt-4">
            <AgentPayoutsList statusFilter="paid" />
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
