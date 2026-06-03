import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Trophy, DollarSign, Target, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const commissionStatusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

export default function SalesPerformance() {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // My targets for current month
  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ['my-sales-targets', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('user_id', user!.id)
        .lte('period_start', format(now, 'yyyy-MM-dd'))
        .gte('period_end', format(now, 'yyyy-MM-dd'))
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // My commissions
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['my-commissions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_commissions')
        .select('*, leads(name, company)')
        .eq('sales_rep_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // My activity counts this month
  const { data: activityCounts } = useQuery({
    queryKey: ['my-activity-counts', user?.id, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_activities')
        .select('activity_type')
        .eq('created_by', user!.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      const activities = data || [];
      return {
        calls: activities.filter(a => a.activity_type === 'call').length,
        emails: activities.filter(a => a.activity_type === 'email').length,
        meetings: activities.filter(a => a.activity_type === 'meeting').length,
        total: activities.length,
      };
    },
    enabled: !!user,
  });

  // Leaderboard: leads converted this month per rep
  const { data: leaderboard } = useQuery({
    queryKey: ['sales-leaderboard', monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('assigned_sales_rep, status')
        .in('status', ['won', 'active'])
        .gte('updated_at', monthStart);
      
      const repCounts: Record<string, number> = {};
      (data || []).forEach(l => {
        if (l.assigned_sales_rep) {
          repCounts[l.assigned_sales_rep] = (repCounts[l.assigned_sales_rep] || 0) + 1;
        }
      });

      // Get user emails for reps
      const repIds = Object.keys(repCounts);
      if (!repIds.length) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', repIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Unknown']));
      
      return Object.entries(repCounts)
        .map(([id, count]) => ({ id, name: profileMap.get(id) || id.slice(0, 8), conversions: count }))
        .sort((a, b) => b.conversions - a.conversions);
    },
  });

  const totalPending = commissions?.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0) || 0;
  const totalEarned = commissions?.reduce((s, c) => s + Number(c.commission_amount), 0) || 0;
  const totalPaid = commissions?.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0) || 0;

  const leadsProgress = targets ? Math.min(100, (targets.actual_leads / Math.max(targets.target_leads, 1)) * 100) : 0;
  const conversionsProgress = targets ? Math.min(100, (targets.actual_conversions / Math.max(targets.target_conversions, 1)) * 100) : 0;
  const revenueProgress = targets ? Math.min(100, (Number(targets.actual_revenue) / Math.max(Number(targets.target_revenue), 1)) * 100) : 0;

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-muted-foreground">Track your sales targets, commissions, and activity</p>
        </div>

        {/* Quota Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Monthly Targets: {format(now, 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {targetsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !targets ? (
              <p className="text-muted-foreground text-sm">No targets set for this period. Ask your manager to set your monthly quota.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Leads Contacted</span><span className="font-medium">{targets.actual_leads} / {targets.target_leads}</span></div>
                  <Progress value={leadsProgress} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Conversions</span><span className="font-medium">{targets.actual_conversions} / {targets.target_conversions}</span></div>
                  <Progress value={conversionsProgress} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Revenue</span><span className="font-medium">${Number(targets.actual_revenue).toLocaleString()} / ${Number(targets.target_revenue).toLocaleString()}</span></div>
                  <Progress value={revenueProgress} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Commission Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Commission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Paid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Total Earned</div>
                </div>
              </div>
              {commissionsLoading ? <Skeleton className="h-32 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions?.slice(0, 10).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.leads?.name || '—'}</TableCell>
                        <TableCell>${Number(c.commission_amount).toFixed(2)}</TableCell>
                        <TableCell><Badge className={commissionStatusStyles[c.status]}>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!commissions?.length && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No commissions yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Activity Metrics + Leaderboard */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Activity This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <div className="text-2xl font-bold">{activityCounts?.calls || 0}</div>
                    <div className="text-xs text-muted-foreground">Calls</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <div className="text-2xl font-bold">{activityCounts?.emails || 0}</div>
                    <div className="text-xs text-muted-foreground">Emails</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <div className="text-2xl font-bold">{activityCounts?.meetings || 0}</div>
                    <div className="text-xs text-muted-foreground">Meetings</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Team Leaderboard</CardTitle>
                <CardDescription>Conversions this month</CardDescription>
              </CardHeader>
              <CardContent>
                {!leaderboard?.length ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No conversions this month yet</p>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((rep, i) => (
                      <div key={rep.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-800' : i === 1 ? 'bg-gray-100 text-gray-800' : i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{rep.name}</div>
                        </div>
                        <div className="font-semibold">{rep.conversions}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
