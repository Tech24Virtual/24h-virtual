import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users, Clock, AlertTriangle, UserPlus, MoreHorizontal, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { MarkClientChurnedDialog, type ChurnTargetClient } from '@/components/admin/MarkClientChurnedDialog';

// ── Types ─────────────────────────────────────────────────────────────────

interface LeadClient {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  service_type: string | null;
  plan_minutes: number | null;
  pipeline_stage: string | null;
  subscription_started_at: string | null;
  wl_partner_id: string | null;
}

interface UsageMap {
  [leadId: string]: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  virtual_receptionist: 'Virtual Receptionist',
  ai_receptionist: 'AI Receptionist',
  hybrid_receptionist: 'Hybrid Receptionist',
  virtual_assistant: 'Virtual Assistant',
  virtual_secretary: 'Virtual Secretary',
  message_assistant: 'Message Assistant',
};

const STAGE_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  ready_for_billing: { label: 'Ready for Billing', variant: 'secondary' },
  churned: { label: 'Churned', variant: 'destructive' },
  onboarding: { label: 'Onboarding', variant: 'outline' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getUsageColor(pct: number) {
  if (pct >= 90) return 'text-destructive';
  if (pct >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function getBarColor(pct: number) {
  if (pct >= 90) return '[&>div]:bg-destructive';
  if (pct >= 70) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminClients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [churnTarget, setChurnTarget] = useState<ChurnTargetClient | null>(null);

  // Stable for the whole month — changes key at month rollover, invalidating the cache
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  // ── Clients query — active accounts only. Churned/onboarding/etc. moved
  // to the Leads and Re-Engage tabs so this view means what it says. ──────
  const {
    data: clients = [],
    isLoading: loadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['admin-clients'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company, phone, service_type, plan_minutes, pipeline_stage, subscription_started_at, wl_partner_id')
        .eq('pipeline_stage', 'active')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeadClient[];
    },
  });

  function handleChurned() {
    queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    queryClient.invalidateQueries({ queryKey: ['admin-reengage-clients'] });
  }

  // ── Usage query (independent — a 403 here doesn't blank the client list) ─
  const { data: usage = {} as UsageMap, isLoading: loadingUsage } = useQuery({
    queryKey: ['admin-clients-usage', monthStart],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('client_id, billable_minutes')
        .gte('call_date', monthStart);
      if (error) throw error;
      const map: UsageMap = {};
      for (const row of data ?? []) {
        map[row.client_id] = (map[row.client_id] || 0) + (row.billable_minutes || 0);
      }
      return map;
    },
  });

  const isLoading = loadingClients || loadingUsage;

  // ── Derived state ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q);
      const matchesService = serviceFilter === 'all' || c.service_type === serviceFilter;
      return matchesSearch && matchesService;
    });
  }, [clients, searchQuery, serviceFilter]);

  const activeCount = clients.filter((c) => c.pipeline_stage === 'active').length;
  const totalMinutes = Object.values(usage).reduce((s, v) => s + v, 0);
  const overUsage = clients.filter((c) => {
    if (!c.plan_minutes || c.plan_minutes <= 0) return false;
    return (usage[c.id] || 0) / c.plan_minutes >= 0.9;
  }).length;
  const newThisMonth = clients.filter(
    (c) => c.subscription_started_at && new Date(c.subscription_started_at) >= new Date(monthStart),
  ).length;

  const statCards = [
    { label: 'Active Clients',      value: activeCount,                   icon: Users,         color: 'text-primary',                          bg: 'bg-primary/10' },
    { label: 'Minutes This Month',  value: totalMinutes.toLocaleString(), icon: Clock,         color: 'text-green-600 dark:text-green-400',     bg: 'bg-green-500/10' },
    { label: 'Over 90% Usage',      value: overUsage,                     icon: AlertTriangle, color: 'text-destructive',                       bg: 'bg-destructive/10' },
    { label: 'New This Month',      value: newThisMonth,                  icon: UserPlus,      color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-500/10' },
  ];

  const serviceTypes = [...new Set(clients.map((c) => c.service_type).filter(Boolean))] as string[];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Client Management</h1>
        <p className="text-muted-foreground mt-1">Active clients with usage tracking</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', s.bg)}>
                  <s.icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-0.5" />
                  ) : (
                    <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error state — shown when clients query fails */}
      {!!clientsError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Failed to load clients. Verify <code className="font-mono text-xs">GRANT SELECT ON public.leads</code> and{' '}
              <code className="font-mono text-xs">GRANT SELECT ON public.call_logs</code> are applied to the{' '}
              <code className="font-mono text-xs">authenticated</code> role.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Clients ({filtered.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {serviceTypes.map((st) => (
                    <SelectItem key={st} value={st}>
                      {SERVICE_LABELS[st] || st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No clients found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="min-w-[180px]">Usage This Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => {
                    const used  = usage[client.id] || 0;
                    const limit = client.plan_minutes || 0;
                    // Guard: pct is 0 when plan_minutes is null/0 — no NaN possible
                    const pct   = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
                    const stage = STAGE_STYLES[client.pipeline_stage || ''] || {
                      label: client.pipeline_stage || 'Unknown',
                      variant: 'outline' as const,
                    };

                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/leads/${client.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                            {client.company && (
                              <p className="text-xs text-muted-foreground">{client.company}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {SERVICE_LABELS[client.service_type || ''] || client.service_type || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {limit > 0 ? `${limit} min/mo` : '—'}
                        </TableCell>
                        <TableCell>
                          {limit > 0 ? (
                            <div className="space-y-1">
                              <Progress value={pct} className={cn('h-2', getBarColor(pct))} />
                              <p className={cn('text-xs font-medium', getUsageColor(pct))}>
                                {used} / {limit} min ({pct}%)
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No plan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stage.variant}>{stage.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.subscription_started_at
                            ? format(new Date(client.subscription_started_at), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/leads/${client.id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/billing?client=${client.id}`)}>
                                View Billing
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setChurnTarget({
                                    id: client.id,
                                    name: client.name,
                                    wl_partner_id: client.wl_partner_id,
                                  })
                                }
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Mark as Churned
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MarkClientChurnedDialog
        client={churnTarget}
        open={!!churnTarget}
        onOpenChange={(v) => !v && setChurnTarget(null)}
        onChurned={handleChurned}
      />
    </div>
  );
}
