import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Clock, AlertTriangle, FileText, ArrowRight,
  PhoneOutgoing, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { OutboundCallRequestDialog } from '@/components/client-dashboard/OutboundCallRequestDialog';
import { usePageView, track } from '@/lib/analytics';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDuration(secs: number | null) {
  if (!secs) return '—';
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  missed:    'bg-red-100 text-red-700',
  voicemail: 'bg-yellow-100 text-yellow-700',
};

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [outboundDialogOpen, setOutboundDialogOpen] = useState(false);
  usePageView('client_dashboard', 'client');

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Stable month key — changes naturally when the month turns
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  // 1. Lead record — provides leadId + pipeline_stage
  const { data: lead } = useQuery({
    queryKey: ['client-lead', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, pipeline_stage')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 2. Current-month calls for stats
  const { data: monthCalls, isLoading: statsLoading } = useQuery({
    queryKey: ['client-month-calls', lead?.id, monthKey],
    queryFn: async () => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from('call_logs')
        .select('id, handle_time_seconds, status')
        .eq('client_id', lead!.id)
        .gte('created_at', start);
      return data || [];
    },
    enabled: !!lead?.id,
    staleTime: 60_000,
  });

  // 3. Recent 5 calls (all time)
  const { data: recentCalls, isLoading: recentLoading } = useQuery({
    queryKey: ['client-recent-calls', lead?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('call_logs')
        .select('id, caller_name, caller_phone, handle_time_seconds, status, created_at')
        .eq('client_id', lead!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!lead?.id,
    staleTime: 60_000,
  });

  // 4. Handoff status — hide setup banner once client has submitted
  const { data: handoffStatus } = useQuery({
    queryKey: ['client-handoff-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_onboarding_handoffs')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.status ?? null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 5. Active scripts count
  const { data: activeScripts = 0 } = useQuery({
    queryKey: ['client-scripts-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('client_scripts')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', user!.id)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Derived stats
  const callsThisMonth = monthCalls?.length ?? 0;
  const totalMinutes = Math.round(
    (monthCalls?.reduce((s, c) => s + (c.handle_time_seconds ?? 0), 0) ?? 0) / 60,
  );
  const missedCalls = monthCalls?.filter(c => c.status === 'missed').length ?? 0;

  // Account status
  const pipelineStage = lead?.pipeline_stage;
  const isActive = pipelineStage === 'active';
  // Hide setup banner when client already submitted (handoff at ready_for_submission/activated)
  // OR when the lead's pipeline_stage is active/churned
  const handoffDone = ['ready_for_submission', 'activated', 'complete'].includes(handoffStatus ?? '');
  const isSetupNeeded = !handoffDone && (!pipelineStage || !['active', 'churned'].includes(pipelineStage ?? ''));

  const statusBadge = isActive
    ? { label: 'Active',      cls: 'bg-green-100 text-green-700 border-green-200' }
    : isSetupNeeded
    ? { label: 'Setting Up',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    : { label: pipelineStage ?? 'Inactive', cls: 'bg-muted text-muted-foreground' };

  const statCards = [
    { label: 'Calls This Month', value: callsThisMonth, icon: Phone,         iconBg: 'bg-primary/10',      iconColor: 'text-primary' },
    { label: 'Total Minutes',    value: totalMinutes,   icon: Clock,          iconBg: 'bg-blue-50',         iconColor: 'text-blue-600' },
    { label: 'Missed Calls',     value: missedCalls,    icon: AlertTriangle,  iconBg: 'bg-destructive/10',  iconColor: 'text-destructive' },
    { label: 'Active Scripts',   value: activeScripts,  icon: FileText,       iconBg: 'bg-secondary/10',    iconColor: 'text-secondary' },
  ];

  return (
    <DashboardLayout>
      {/* Section 1 — Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-heading">
              {getGreeting()}, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Badge variant="outline" className={cn('text-sm px-3 py-1 shrink-0', statusBadge.cls)}>
            {isActive
              ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" />
              : <AlertCircle className="w-3.5 h-3.5 mr-1.5 inline" />}
            {statusBadge.label}
          </Badge>
        </div>
      </div>

      {/* Section 2 — 4 stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-heading mt-1">{stat.value}</p>
                  )}
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.iconBg)}>
                  <stat.icon className={cn('w-6 h-6', stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 3 — Two-column: Recent Calls (2/3) + sidebar (1/3) */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Calls table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : !recentCalls?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No calls yet</p>
                <p className="text-sm mt-1">Your recent call activity will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {['Caller', 'Phone', 'Duration', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left font-medium text-muted-foreground pb-3 pr-4 last:pr-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentCalls.map((call) => (
                      <tr
                        key={call.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate('/client-dashboard/calls')}
                      >
                        <td className="py-3 pr-4 font-medium">{call.caller_name || 'Unknown'}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{call.caller_phone || '—'}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{fmtDuration(call.handle_time_seconds)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[call.status ?? ''])}>
                            {call.status ?? 'unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(call.created_at), 'MMM d, h:mm a')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/client-dashboard/calls">
                View All Calls <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions + Account Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link
                  to="/client-dashboard/scripts"
                  onClick={() => track.quickAction('client_dashboard', 'create_script', 'client')}
                >
                  <FileText className="mr-2 w-4 h-4" />
                  Create New Script
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link
                  to="/client-dashboard/schedule"
                  onClick={() => track.quickAction('client_dashboard', 'update_business_hours', 'client')}
                >
                  <Clock className="mr-2 w-4 h-4" />
                  Update Business Hours
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link
                  to="/client-dashboard/billing"
                  onClick={() => track.quickAction('client_dashboard', 'view_billing', 'client')}
                >
                  <ArrowRight className="mr-2 w-4 h-4" />
                  View Usage & Billing
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  track.quickAction('client_dashboard', 'request_outbound_call', 'client');
                  setOutboundDialogOpen(true);
                }}
              >
                <PhoneOutgoing className="mr-2 w-4 h-4" />
                Request Outbound Call
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className={cn('text-xs', statusBadge.cls)}>
                  {statusBadge.label}
                </Badge>
              </div>
              {profile?.company_name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span className="text-sm font-medium truncate max-w-[150px]">{profile.company_name}</span>
                </div>
              )}
              {user?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm text-muted-foreground truncate max-w-[150px]">{user.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 4 — Setup banner (hidden once account is active or setup submitted) */}
      {isSetupNeeded && (
        <Card data-testid="setup-banner" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">Complete your account setup to go live</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your service won't start until you submit your business details.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/client-dashboard/setup">
                Complete Setup <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <OutboundCallRequestDialog
        open={outboundDialogOpen}
        onClose={(saved) => {
          if (saved) track.cta('client_dashboard', 'outbound_call_submitted', 'client');
          setOutboundDialogOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
