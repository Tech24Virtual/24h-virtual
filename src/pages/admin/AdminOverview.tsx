import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import {
  Users, Building2, Headphones, Phone, Share2, ArrowRight, AlertTriangle,
  MessageSquare, BarChart3, Search, CheckCircle2, UserPlus, CreditCard,
  Layers, Shield, TrendingUp, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { FulfillmentPulseCards } from '@/components/admin/fulfillment/FulfillmentPulseCards';
import { useTopCampaigns30d } from '@/hooks/campaign-os/useCampaignRollup';
import { usePageView } from '@/lib/analytics';

// ── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatSource(source: string | null | undefined): string {
  if (!source) return 'Direct';
  return source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function timeAgo(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminOverview() {
  usePageView('admin_overview', 'admin');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin';
  const todayLabel = format(new Date(), 'EEEE, MMMM d, yyyy');

  // ── Primary stats — each is an independent query ──────────────────────────
  // Isolation means one 403 or missing table doesn't wipe out the whole dashboard.

  const { data: activeClientsCount, isLoading: loadingClients } = useQuery({
    queryKey: ['admin-stat-active-clients'],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('pipeline_stage', ['active', 'onboarding', 'ready_for_billing']);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: openTicketsCount, isLoading: loadingTickets } = useQuery({
    queryKey: ['admin-stat-open-tickets'],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: leadsThisMonth, isLoading: loadingLeadsMonth } = useQuery({
    queryKey: ['admin-stat-leads-month'],
    staleTime: 60_000,
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: agentsOnShift, isLoading: loadingAgentsOnShift } = useQuery({
    queryKey: ['admin-stat-agents-on-shift'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('agent_shifts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ── Secondary stats (pill row) ─────────────────────────────────────────────

  const { data: totalLeads, error: totalLeadsError } = useQuery({
    queryKey: ['admin-stat-total-leads'],
    staleTime: 120_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: wlPartnersCount, error: wlPartnersError } = useQuery({
    queryKey: ['admin-stat-wl-partners'],
    staleTime: 120_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('white_label_partners')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: totalAgents, error: totalAgentsError } = useQuery({
    queryKey: ['admin-stat-agents'],
    staleTime: 120_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'agent');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: totalCalls, error: totalCallsError } = useQuery({
    queryKey: ['admin-stat-calls'],
    staleTime: 120_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ── Workflow alerts — all 4 in one query but failure returns 0s not blank ──

  const { data: alertCounts } = useQuery({
    queryKey: ['admin-workflow-alerts'],
    staleTime: 60_000,
    queryFn: async () => {
      const threeDaysAgo = subDays(new Date(), 3).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('pipeline_stage', 'ready_for_billing').lte('updated_at', threeDaysAgo),
        supabase.from('wl_client_service_config').select('id', { count: 'exact', head: true })
          .eq('billing_verified', false),
        supabase.from('payment_failures').select('id', { count: 'exact', head: true })
          .is('resolved_at', null).lte('created_at', sevenDaysAgo),
        supabase.from('wl_terms_agreements').select('id', { count: 'exact', head: true })
          .eq('is_current', true).is('signed_at', null),
      ]);
      return {
        stuckAtBilling: r1.error ? 0 : (r1.count ?? 0),
        unverifiedWLClients: r2.error ? 0 : (r2.count ?? 0),
        unresolvedPaymentFailures: r3.error ? 0 : (r3.count ?? 0),
        unsignedAgreements: r4.error ? 0 : (r4.count ?? 0),
      };
    },
  });

  // ── Ticket pipeline — always shown ────────────────────────────────────────

  const { data: ticketsBySource = [] } = useQuery({
    queryKey: ['admin-tickets-by-source'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('source, status')
        .in('status', ['open', 'in_progress']);
      if (error) throw error;
      const map = new Map<string, { open: number; inProgress: number }>();
      (data ?? []).forEach(t => {
        const entry = map.get(t.source) ?? { open: 0, inProgress: 0 };
        if (t.status === 'open') entry.open++;
        if (t.status === 'in_progress') entry.inProgress++;
        map.set(t.source, entry);
      });
      return Array.from(map.entries()).map(([source, d]) => ({ source, ...d }));
    },
  });

  // ── Recent activity ────────────────────────────────────────────────────────

  const { data: recentLeads = [] } = useQuery({
    queryKey: ['admin-recent-activity'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, source, status, pipeline_stage, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Campaign OS ────────────────────────────────────────────────────────────

  const { data: topCampaigns = [], isLoading: topLoading } = useTopCampaigns30d(5);

  // ── Derived ────────────────────────────────────────────────────────────────

  const workflowAlerts = [
    { count: alertCounts?.stuckAtBilling ?? 0, label: 'Leads stuck at "ready_for_billing" (3+ days)', color: 'text-orange-500', href: '/admin/leads' },
    { count: alertCounts?.unverifiedWLClients ?? 0, label: 'WL clients with unverified billing', color: 'text-orange-500', href: '/admin/partners' },
    { count: alertCounts?.unresolvedPaymentFailures ?? 0, label: 'Payment failures unresolved (7+ days)', color: 'text-destructive', href: '/staff/billing/payment-issues' },
    { count: alertCounts?.unsignedAgreements ?? 0, label: 'Partners with unsigned agreements', color: 'text-orange-500', href: '/admin/partners' },
  ].filter(a => a.count > 0);

  const hasAlerts = workflowAlerts.length > 0;

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/admin/leads?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Section 1: Header ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {firstName} 👋</h1>
            <p className="text-muted-foreground mt-0.5">{todayLabel} · Platform Overview</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads, clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Workflow Alerts — always visible ─────────────────── */}
      <Card className={cn('border', hasAlerts ? 'border-orange-500/20' : 'border-green-500/20')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {hasAlerts ? (
              <><AlertTriangle className="w-4 h-4 text-orange-500" /> Workflow Alerts</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 text-green-500" /> System Status</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertCounts === undefined ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !hasAlerts ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium py-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              All systems operational — no workflow blockers
            </div>
          ) : (
            <div className="space-y-2">
              {workflowAlerts.map((alert, i) => (
                <Link
                  key={i}
                  to={alert.href}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xl font-bold tabular-nums', alert.color)}>{alert.count}</span>
                    <span className="text-sm">{alert.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3: Primary Stats — 4 large cards ────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Active Clients */}
        <Link to="/admin/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  {loadingClients ? (
                    <Skeleton className="h-9 w-14 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{activeClientsCount ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">active + onboarding</p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Open Tickets */}
        <Link to="/admin/tickets">
          <Card className={cn('hover:shadow-md transition-shadow cursor-pointer h-full', (openTicketsCount ?? 0) > 0 && 'border-orange-500/20')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                  {loadingTickets ? (
                    <Skeleton className="h-9 w-14 mt-1" />
                  ) : (
                    <p className={cn('text-3xl font-bold mt-1', (openTicketsCount ?? 0) > 0 ? 'text-orange-500' : '')}>
                      {openTicketsCount ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">open + in progress</p>
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0', (openTicketsCount ?? 0) > 0 ? 'bg-orange-500/10' : 'bg-muted')}>
                  <MessageSquare className={cn('w-6 h-6', (openTicketsCount ?? 0) > 0 ? 'text-orange-500' : 'text-muted-foreground')} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Leads This Month */}
        <Link to="/admin/leads">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leads This Month</p>
                  {loadingLeadsMonth ? (
                    <Skeleton className="h-9 w-14 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{leadsThisMonth ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(), 'MMMM yyyy')}</p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10 shrink-0">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Agents On Shift Now */}
        <Link to="/admin/agents">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agents On Shift</p>
                  {loadingAgentsOnShift ? (
                    <Skeleton className="h-9 w-14 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1 text-green-600">{agentsOnShift ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">currently clocked in</p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/10 shrink-0">
                  <Headphones className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* ── Section 4: Secondary Stats — pill row ───────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {([
          { label: 'Total Leads', value: totalLeads, error: !!totalLeadsError, icon: Users, href: '/admin/leads' },
          { label: 'WL Partners', value: wlPartnersCount, error: !!wlPartnersError, icon: Share2, href: '/admin/partners' },
          { label: 'Total Agents', value: totalAgents, error: !!totalAgentsError, icon: Headphones, href: '/admin/agents' },
          { label: 'Total Calls', value: totalCalls, error: !!totalCallsError, icon: Phone, href: '/admin/analytics' },
        ] as const).map(stat => (
          <Link key={stat.label} to={stat.href}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card hover:bg-muted/50 transition-colors text-sm cursor-pointer">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{stat.label}:</span>
              <span className={cn('font-semibold tabular-nums', stat.error && 'text-destructive')}>
                {stat.error ? 'Error' : stat.value ?? '—'}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Section 5: Two-column layout ────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: 2/3 width */}
        <div className="lg:col-span-2 space-y-6">

          {/* Fulfillment Pulse */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-primary" />
                  Fulfillment Pulse
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/fulfillment-intake">
                    Open queue <ArrowRight className="ml-1 w-3 h-3" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FulfillmentPulseCards audience="admin" />
            </CardContent>
          </Card>

          {/* Top 5 Campaigns */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Top 5 Campaigns (30 days)
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/campaign-os/reporting">
                    Open reporting <ArrowRight className="ml-1 w-3 h-3" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : topCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No attributed call activity in the last 30 days.
                </p>
              ) : (
                <div className="space-y-2">
                  {topCampaigns.map(c => (
                    <Link
                      key={c.campaign_id}
                      to={`/admin/campaign-os/campaigns/${c.campaign_id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {c.display_name ?? 'Untitled campaign'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {String(c.tenant_kind).split('_').join(' ')}
                          {c.published_version_id ? ' · published' : ' · draft'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div>
                          <p className="text-sm font-semibold tabular-nums">{c.calls_30d}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">calls</p>
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-sm font-semibold tabular-nums">{Math.round(c.avg_handle_time_seconds)}s</p>
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

          {/* Ticket Pipeline by Source — always shown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Ticket Pipeline by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsBySource.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium py-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  No open tickets
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {ticketsBySource.map(t => (
                    <Link key={t.source} to="/admin/tickets">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-medium capitalize">{formatSource(t.source)}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                            {t.open} open
                          </Badge>
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                            {t.inProgress} active
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right: 1/3 width */}
        <div className="space-y-6">

          {/* Quick Actions — 6 actions with distinct icons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {([
                { label: 'New Lead', icon: UserPlus, href: '/admin/leads', color: 'text-blue-600' },
                { label: 'Manage Clients', icon: Building2, href: '/admin/clients', color: 'text-primary' },
                { label: 'Partners', icon: Share2, href: '/admin/partners', color: 'text-violet-600' },
                { label: 'Agents', icon: Headphones, href: '/admin/agents', color: 'text-green-600' },
                { label: 'Billing', icon: CreditCard, href: '/admin/billing', color: 'text-orange-500' },
                { label: 'Campaign OS', icon: Layers, href: '/admin/campaign-os', color: 'text-purple-600' },
              ] as const).map(action => (
                <Button key={action.label} variant="outline" className="w-full justify-start" asChild>
                  <Link to={action.href}>
                    <action.icon className={cn('mr-2 w-4 h-4 shrink-0', action.color)} />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/leads">
                  View All <ArrowRight className="ml-1 w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLeads.map(lead => (
                    <Link
                      key={lead.id}
                      to={`/admin/leads/${lead.id}`}
                      className="flex items-start gap-3 group"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        lead.status === 'converted' ? 'bg-green-500/10' : 'bg-primary/10',
                      )}>
                        <Users className={cn(
                          'w-4 h-4',
                          lead.status === 'converted' ? 'text-green-600' : 'text-primary',
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {lead.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {(lead.pipeline_stage ?? lead.status ?? '').replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatSource(lead.source)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(lead.created_at)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
