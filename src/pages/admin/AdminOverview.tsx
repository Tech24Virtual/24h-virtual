import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Headphones, Phone, Share2, Clock, ArrowRight, AlertTriangle, MessageSquare, Shield, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, subDays } from 'date-fns';
import { FulfillmentPulseCards } from '@/components/admin/fulfillment/FulfillmentPulseCards';
import { useTopCampaigns30d } from '@/hooks/campaign-os/useCampaignRollup';

interface Stats {
  totalLeads: number;
  totalClients: number;
  totalAgents: number;
  totalCalls: number;
  totalAffiliates: number;
  newLeadsToday: number;
  wlPartners: number;
  openTickets: number;
  wlMonthlyRevenue: number;
}

interface RecentActivity {
  id: string;
  type: 'lead' | 'call' | 'conversion';
  title: string;
  description: string;
  source?: string;
  status?: string;
  timestamp: string;
}

interface SystemHealth {
  stuckAtBilling: number;
  unverifiedWLClients: number;
  unresolvedPaymentFailures: number;
  unsignedAgreements: number;
  ticketsBySource: { source: string; open: number; inProgress: number }[];
}

import { usePageView } from '@/lib/analytics';

export default function AdminOverview() {
  usePageView('admin_overview', 'admin');
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0, totalClients: 0, totalAgents: 0, totalCalls: 0,
    totalAffiliates: 0, newLeadsToday: 0, wlPartners: 0, openTickets: 0, wlMonthlyRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    stuckAtBilling: 0, unverifiedWLClients: 0, unresolvedPaymentFailures: 0,
    unsignedAgreements: 0, ticketsBySource: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const { data: topCampaigns = [], isLoading: topLoading } = useTopCampaigns30d(5);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysAgo = subDays(new Date(), 3).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        leads, leadsToday, activeClients, calls, affiliates, agents, recentLeads,
        wlPartners, openTickets, wlUsage,
        stuckBilling, unverifiedWL, unresolvedPF, unsignedAgreements, allTickets
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        // P0-4: Total Clients counts active accounts (leads in active pipeline
        // stages), not all profiles (which include partners, staff, applicants).
        // TODO: replace with v_clients view (P2-13).
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .in('pipeline_stage', ['active', 'onboarding', 'ready_for_billing']),
        supabase.from('call_logs').select('id', { count: 'exact', head: true }),
        supabase.from('affiliates').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'agent'),
        supabase.from('leads').select('id, name, email, source, status, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('white_label_partners').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('wl_partner_usage_summary').select('total_wholesale_cost').gte('billing_period_start', startOfMonth.toISOString()),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('pipeline_stage', 'ready_for_billing').lte('updated_at', threeDaysAgo),
        supabase.from('wl_client_service_config').select('id', { count: 'exact', head: true }).eq('billing_verified', false),
        supabase.from('payment_failures').select('id', { count: 'exact', head: true }).is('resolved_at', null).lte('created_at', sevenDaysAgo),
        supabase.from('wl_terms_agreements').select('id', { count: 'exact', head: true }).eq('is_current', true).is('signed_at', null),
        supabase.from('support_tickets').select('source, status').in('status', ['open', 'in_progress']),
      ]);

      const wlRevenue = (wlUsage.data || []).reduce((sum, r) => sum + (r.total_wholesale_cost || 0), 0);

      setStats({
        totalLeads: leads.count || 0, newLeadsToday: leadsToday.count || 0,
        totalClients: activeClients.count || 0, totalCalls: calls.count || 0,
        totalAffiliates: affiliates.count || 0, totalAgents: agents.count || 0,
        wlPartners: wlPartners.count || 0, openTickets: openTickets.count || 0,
        wlMonthlyRevenue: wlRevenue,
      });

      // Ticket health by source
      const ticketMap = new Map<string, { open: number; inProgress: number }>();
      (allTickets.data || []).forEach(t => {
        const entry = ticketMap.get(t.source) || { open: 0, inProgress: 0 };
        if (t.status === 'open') entry.open++;
        if (t.status === 'in_progress') entry.inProgress++;
        ticketMap.set(t.source, entry);
      });

      setSystemHealth({
        stuckAtBilling: stuckBilling.count || 0,
        unverifiedWLClients: unverifiedWL.count || 0,
        unresolvedPaymentFailures: unresolvedPF.count || 0,
        unsignedAgreements: unsignedAgreements.count || 0,
        ticketsBySource: Array.from(ticketMap.entries()).map(([source, data]) => ({ source, ...data })),
      });

      const activities: RecentActivity[] = (recentLeads.data || []).map(lead => ({
        id: lead.id, type: lead.status === 'converted' ? 'conversion' : 'lead',
        title: lead.status === 'converted' ? 'New Conversion' : 'New Lead',
        description: `${lead.name} (${lead.email})`,
        source: lead.source, status: lead.status, timestamp: lead.created_at,
      }));
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSource = (source: string | null | undefined) => {
    if (!source) return 'Direct';
    return source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'converted': return 'bg-green-500/10 text-green-600';
      case 'qualified': return 'bg-blue-500/10 text-blue-600';
      case 'contacted': return 'bg-yellow-500/10 text-yellow-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statCards = [
    { title: 'Total Leads', value: stats.totalLeads, subtitle: `${stats.newLeadsToday} new today`, icon: Users, href: '/admin/leads', color: 'text-cta', bgColor: 'bg-cta/10' },
    { title: 'Total Clients', value: stats.totalClients, icon: Building2, href: '/admin/clients', color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Active Agents', value: stats.totalAgents, icon: Headphones, href: '/admin/agents', color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { title: 'Total Calls', value: stats.totalCalls, icon: Phone, href: '/admin/analytics', color: 'text-primary', bgColor: 'bg-brand-rose' },
    { title: 'WL Partners', value: stats.wlPartners, icon: Building2, href: '/admin/partners', color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { title: 'Open Tickets', value: stats.openTickets, icon: MessageSquare, href: '/admin/tickets', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Affiliates', value: stats.totalAffiliates, icon: Share2, href: '/admin/partners', color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { title: 'WL Revenue', value: `$${stats.wlMonthlyRevenue.toFixed(0)}`, icon: DollarSign, href: '/admin/analytics', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  ];

  const alerts = [
    { count: systemHealth.stuckAtBilling, label: 'Leads stuck at "ready_for_billing" (3+ days)', color: 'text-orange-500', href: '/admin/leads' },
    { count: systemHealth.unverifiedWLClients, label: 'WL clients with unverified billing', color: 'text-orange-500', href: '/admin/partners' },
    { count: systemHealth.unresolvedPaymentFailures, label: 'Payment failures unresolved (7+ days)', color: 'text-destructive', href: '/staff/billing/payment-issues' },
    { count: systemHealth.unsignedAgreements, label: 'Partners with unsigned agreements', color: 'text-orange-500', href: '/admin/partners' },
  ].filter(a => a.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome to your admin dashboard</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-heading mt-1">
                      {isLoading ? '...' : stat.value}
                    </p>
                    {stat.subtitle && <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>}
                  </div>
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.bgColor)}>
                    <stat.icon className={cn('w-6 h-6', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Workflow Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Workflow Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, i) => (
              <Link key={i} to={alert.href} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cn('text-xl font-bold', alert.color)}>{alert.count}</span>
                  <span className="text-sm text-heading">{alert.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fulfillment Pulse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Fulfillment Pulse
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/fulfillment-intake">
                Open queue <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FulfillmentPulseCards audience="admin" />
        </CardContent>
      </Card>

      {/* Top 5 Campaigns (last 30 days) — Phase H */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Top 5 Campaigns (last 30 days)
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/campaign-os/reporting">
              Open reporting <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {topLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
          ) : topCampaigns.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No attributed call activity in the last 30 days.
            </div>
          ) : (
            <div className="space-y-2">
              {topCampaigns.map((c) => (
                <Link
                  key={c.campaign_id}
                  to={`/admin/campaign-os/campaigns/${c.campaign_id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-heading truncate">
                      {c.display_name ?? 'Untitled campaign'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {String(c.tenant_kind).split('_').join(' ')}
                      {c.published_version_id ? ' • published' : ' • draft'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-semibold text-heading">{c.calls_30d}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">calls</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-semibold text-heading">
                        {Math.round(c.avg_handle_time_seconds)}s
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">AHT</p>
                    </div>
                    {c.missed_pct != null && (
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                        {Math.round(c.missed_pct)}% missed
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {systemHealth.ticketsBySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Ticket Pipeline by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemHealth.ticketsBySource.map(t => (
                <div key={t.source} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm font-medium text-heading capitalize">{formatSource(t.source)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">{t.open} open</Badge>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">{t.inProgress} active</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/leads"><Users className="mr-2 w-4 h-4" />View All Leads</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/clients"><Building2 className="mr-2 w-4 h-4" />Manage Clients</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/partners"><Building2 className="mr-2 w-4 h-4" />Manage Partners</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/tickets"><MessageSquare className="mr-2 w-4 h-4" />View Tickets</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/leads">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">New leads and actions will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      activity.type === 'conversion' ? 'bg-green-500/10' : 'bg-primary/10'
                    )}>
                      <Users className={cn('w-4 h-4', activity.type === 'conversion' ? 'text-green-600' : 'text-primary')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-heading">{activity.title}</p>
                        {activity.status && (
                          <Badge variant="secondary" className={cn('text-xs', getStatusColor(activity.status))}>
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.source && <span className="text-xs text-muted-foreground">via {formatSource(activity.source)}</span>}
                        <span className="text-xs text-muted-foreground">
                          • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
