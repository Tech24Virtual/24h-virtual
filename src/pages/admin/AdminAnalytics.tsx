import { useQuery } from '@tanstack/react-query';
import { Phone, Users, DollarSign, TrendingUp, Building2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, subMonths } from 'date-fns';

interface AnalyticsData {
  totalCalls: number;
  totalCallDuration: number;
  averageCallDuration: number;
  leadsThisMonth: number;
  conversionsThisMonth: number;
}

interface CallsByDay {
  date: string;
  calls: number;
  duration: number;
}

interface LeadsBySource {
  source: string;
  count: number;
}

interface PartnerRevenue {
  month: string;
  revenue: number;
}

interface PartnerBreakdown {
  partner: string;
  revenue: number;
}

interface AnalyticsResult {
  summary: AnalyticsData;
  callsByDay: CallsByDay[];
  leadsBySource: LeadsBySource[];
  partnerRevenue: PartnerRevenue[];
  partnerBreakdown: PartnerBreakdown[];
}

function formatSource(source: string) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

export default function AdminAnalytics() {
  const { data: analytics, isLoading, isError, refetch } = useQuery<AnalyticsResult>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const last30Days = subDays(new Date(), 30);
      const sixMonthsAgo = subMonths(new Date(), 6);

      const [calls, leadsThisMonth, conversions, recentCalls, allLeads, wlUsage, wlPartners] = await Promise.all([
        supabase.from('call_logs').select('call_duration'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'converted').gte('created_at', startOfMonth.toISOString()),
        supabase.from('call_logs').select('created_at, call_duration').gte('created_at', last30Days.toISOString()).order('created_at', { ascending: true }),
        supabase.from('leads').select('source').gte('created_at', startOfMonth.toISOString()),
        supabase.from('wl_partner_usage_summary').select('partner_id, billing_period_start, total_wholesale_cost').gte('billing_period_start', sixMonthsAgo.toISOString()).order('billing_period_start', { ascending: true }),
        supabase.from('white_label_partners').select('id, company_name'),
      ]);

      if (calls.error) throw calls.error;
      if (leadsThisMonth.error) throw leadsThisMonth.error;

      const totalCalls = calls.data?.length || 0;
      const totalDuration = calls.data?.reduce((sum, c) => sum + (c.call_duration || 0), 0) || 0;

      const summary: AnalyticsData = {
        totalCalls, totalCallDuration: totalDuration,
        averageCallDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        leadsThisMonth: leadsThisMonth.count || 0,
        conversionsThisMonth: conversions.count || 0,
      };

      const callsMap = new Map<string, { calls: number; duration: number }>();
      for (let i = 13; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'MMM dd');
        callsMap.set(date, { calls: 0, duration: 0 });
      }
      recentCalls.data?.forEach(call => {
        const date = format(new Date(call.created_at), 'MMM dd');
        const existing = callsMap.get(date) || { calls: 0, duration: 0 };
        callsMap.set(date, { calls: existing.calls + 1, duration: existing.duration + (call.call_duration || 0) });
      });
      const callsByDay: CallsByDay[] = Array.from(callsMap.entries()).map(([date, d]) => ({
        date, calls: d.calls, duration: Math.round(d.duration / 60),
      }));

      const sourceMap = new Map<string, number>();
      allLeads.data?.forEach(lead => {
        const source = lead.source || 'Unknown';
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });
      const leadsBySource: LeadsBySource[] = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source: formatSource(source), count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const partnerNameMap = new Map<string, string>();
      (wlPartners.data || []).forEach(p => partnerNameMap.set(p.id, p.company_name));

      const revMap = new Map<string, number>();
      const partnerTotals = new Map<string, number>();
      (wlUsage.data || []).forEach(u => {
        const month = format(new Date(u.billing_period_start), 'MMM yy');
        revMap.set(month, (revMap.get(month) || 0) + u.total_wholesale_cost);
        const pName = partnerNameMap.get(u.partner_id) || 'Unknown';
        partnerTotals.set(pName, (partnerTotals.get(pName) || 0) + u.total_wholesale_cost);
      });
      const partnerRevenue: PartnerRevenue[] = Array.from(revMap.entries()).map(([month, revenue]) => ({ month, revenue }));
      const partnerBreakdown: PartnerBreakdown[] = Array.from(partnerTotals.entries())
        .map(([partner, revenue]) => ({ partner, revenue }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      return { summary, callsByDay, leadsBySource, partnerRevenue, partnerBreakdown };
    },
  });

  const summary = analytics?.summary;
  const callsByDay = analytics?.callsByDay ?? [];
  const leadsBySource = analytics?.leadsBySource ?? [];
  const partnerRevenue = analytics?.partnerRevenue ?? [];
  const partnerBreakdown = analytics?.partnerBreakdown ?? [];

  const stats = [
    { title: 'Total Calls', value: summary?.totalCalls, icon: Phone, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Avg Call Duration', value: summary ? formatDuration(summary.averageCallDuration) : undefined, icon: TrendingUp, color: 'text-cta', bgColor: 'bg-cta/10' },
    { title: 'Leads This Month', value: summary?.leadsThisMonth, icon: Users, color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { title: 'Conversions', value: summary?.conversionsThisMonth, icon: DollarSign, color: 'text-primary', bgColor: 'bg-brand-rose' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your business performance</p>
        </div>
      </div>

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Failed to load analytics data</p>
              <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className="mt-1">
                    {isLoading
                      ? <Skeleton className="h-8 w-20" />
                      : <p className="text-2xl font-bold text-heading">{stat.value ?? '—'}</p>
                    }
                  </div>
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Call Volume (Last 14 Days)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : callsByDay.every(d => d.calls === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><Phone className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No call data available</p></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={callsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Calls" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Lead Sources (This Month)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : leadsBySource.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><Users className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No lead data available</p></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leadsBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="source" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> WL Wholesale Revenue by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : partnerRevenue.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No WL revenue data yet</p></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={partnerRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--cta))" fill="hsl(var(--cta))" fillOpacity={0.2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Revenue by Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : partnerBreakdown.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No partner data yet</p></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={partnerBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="partner" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Call Duration Trend (Minutes)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : callsByDay.every(d => d.duration === 0) ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No duration data available</p></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={callsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} min`, 'Duration']} />
                <Area type="monotone" dataKey="duration" stroke="hsl(var(--cta))" fill="hsl(var(--cta))" fillOpacity={0.2} name="Duration (min)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
