import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import { Trophy, DollarSign, Target, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeMonth, setActiveMonth] = useState(new Date());
  const monthStart = startOfMonth(activeMonth).toISOString();
  const monthEnd = endOfMonth(activeMonth).toISOString();
  const isCurrentMonth = isSameMonth(activeMonth, new Date());

  // My targets for the selected month
  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ['my-sales-targets', user?.id, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('user_id', user!.id)
        .lte('period_start', format(startOfMonth(activeMonth), 'yyyy-MM-dd'))
        .gte('period_end', format(startOfMonth(activeMonth), 'yyyy-MM-dd'))
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // My commissions — filtered to the selected month
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['my-commissions', user?.id, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_commissions')
        .select('*, leads(name, company)')
        .eq('sales_rep_id', user!.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // All-time paid commissions — no date filter, powers the "All-time paid" card
  const { data: allTimeCommissions, isLoading: allTimeLoading } = useQuery({
    queryKey: ['all-time-commissions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_commissions')
        .select('commission_amount, status')
        .eq('sales_rep_id', user!.id)
        .eq('status', 'paid');
      return data || [];
    },
    enabled: !!user,
  });

  // My activity counts for the selected month
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

  // Leaderboard: leads converted in the selected month per rep
  const { data: leaderboard } = useQuery({
    queryKey: ['sales-leaderboard', monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('assigned_sales_rep, pipeline_stage')
        .in('pipeline_stage', ['won', 'active'])
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd);

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

  const earnedThisMonth = commissions?.reduce((s, c) => s + Number(c.commission_amount), 0) || 0;
  const paidThisMonth = commissions?.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0) || 0;
  const pendingPayout = commissions?.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0) || 0;
  const allTimePaid = allTimeCommissions?.reduce((s, c) => s + Number(c.commission_amount), 0) || 0;

  const leadsProgress = targets ? Math.min(100, (targets.actual_leads / Math.max(targets.target_leads, 1)) * 100) : 0;
  const conversionsProgress = targets ? Math.min(100, (targets.actual_conversions / Math.max(targets.target_conversions, 1)) * 100) : 0;
  const revenueProgress = targets ? Math.min(100, (Number(targets.actual_revenue) / Math.max(Number(targets.target_revenue), 1)) * 100) : 0;

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Performance</h1>
            <p className="text-muted-foreground">Track your sales targets, commissions, and activity</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-36 text-center text-sm font-medium">
              {format(activeMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveMonth((m) => addMonths(m, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Earned this month</p>
              {commissionsLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <div className="text-2xl font-bold">${earnedThisMonth.toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Paid this month</p>
              {commissionsLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <div className="text-2xl font-bold text-green-600">${paidThisMonth.toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Pending payout</p>
              {commissionsLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <div className="text-2xl font-bold text-yellow-600">${pendingPayout.toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">All-time paid</p>
              {allTimeLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <div className="text-2xl font-bold">${allTimePaid.toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance">
          <TabsList>
            <TabsTrigger value="performance">My Performance</TabsTrigger>
            <TabsTrigger value="leaderboard">Team Leaderboard</TabsTrigger>
          </TabsList>

          {/* ── My Performance ── */}
          <TabsContent value="performance" className="mt-4 space-y-6">
            {/* Quota Scorecard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />Monthly Targets: {format(activeMonth, 'MMMM yyyy')}
                </CardTitle>
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
                      <p className="text-xs text-muted-foreground">{Math.round(leadsProgress)}% of goal</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>Conversions</span><span className="font-medium">{targets.actual_conversions} / {targets.target_conversions}</span></div>
                      <Progress value={conversionsProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{Math.round(conversionsProgress)}% of goal</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>Revenue</span><span className="font-medium">${Number(targets.actual_revenue).toLocaleString()} / ${Number(targets.target_revenue).toLocaleString()}</span></div>
                      <Progress value={revenueProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{Math.round(revenueProgress)}% of goal</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Commissions table — filtered to selected month */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />Commissions — {format(activeMonth, 'MMMM yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No commissions this month</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Activity Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Activity — {format(activeMonth, 'MMMM yyyy')}</CardTitle>
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
            </div>
          </TabsContent>

          {/* ── Team Leaderboard ── */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Team Leaderboard</CardTitle>
                <CardDescription>Conversions — {format(activeMonth, 'MMMM yyyy')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Rank</TableHead>
                      <TableHead>Rep</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!leaderboard?.length ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No conversions this month yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaderboard.map((rep, i) => {
                        const isMe = rep.id === user?.id;
                        return (
                          <TableRow key={rep.id} className={isMe ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                i === 0 ? 'bg-yellow-100 text-yellow-800' : i === 1 ? 'bg-gray-100 text-gray-800' : i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'
                              }`}>
                                {i + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {rep.name}
                                {isMe && <Badge variant="secondary" className="text-xs">You</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{rep.conversions}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
