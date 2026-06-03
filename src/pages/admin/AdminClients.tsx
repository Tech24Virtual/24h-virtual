import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Clock, AlertTriangle, UserPlus, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

interface UsageMap {
  [leadId: string]: number;
}

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

export default function AdminClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<LeadClient[]>([]);
  const [usage, setUsage] = useState<UsageMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const [leadsRes, usageRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, name, email, company, phone, service_type, plan_minutes, pipeline_stage, subscription_started_at')
        .in('pipeline_stage', ['active', 'ready_for_billing', 'onboarding', 'churned'])
        .order('name', { ascending: true }),
      supabase
        .from('call_logs')
        .select('client_id, billable_minutes')
        .gte('call_date', monthStart),
    ]);

    if (leadsRes.data) setClients(leadsRes.data);

    if (usageRes.data) {
      const map: UsageMap = {};
      for (const row of usageRes.data) {
        map[row.client_id] = (map[row.client_id] || 0) + (row.billable_minutes || 0);
      }
      setUsage(map);
    }

    setIsLoading(false);
  };

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q);
      const matchesService = serviceFilter === 'all' || c.service_type === serviceFilter;
      const matchesStatus = statusFilter === 'all' || c.pipeline_stage === statusFilter;
      return matchesSearch && matchesService && matchesStatus;
    });
  }, [clients, searchQuery, serviceFilter, statusFilter]);

  // Stats
  const activeCount = clients.filter((c) => c.pipeline_stage === 'active').length;
  const totalMinutes = Object.values(usage).reduce((s, v) => s + v, 0);
  const overUsage = clients.filter((c) => {
    if (!c.plan_minutes || c.plan_minutes <= 0) return false;
    const used = usage[c.id] || 0;
    return used / c.plan_minutes >= 0.9;
  }).length;
  const monthStart = startOfMonth(new Date());
  const newThisMonth = clients.filter(
    (c) => c.subscription_started_at && new Date(c.subscription_started_at) >= monthStart,
  ).length;

  const stats = [
    { label: 'Active Clients', value: activeCount, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Minutes This Month', value: totalMinutes.toLocaleString(), icon: Clock, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
    { label: 'Over 90% Usage', value: overUsage, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'New This Month', value: newThisMonth, icon: UserPlus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  ];

  const serviceTypes = [...new Set(clients.map((c) => c.service_type).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Client Management</h1>
        <p className="text-muted-foreground mt-1">Active clients with usage tracking</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', s.bg)}>
                  <s.icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={cn('text-2xl font-bold', s.color)}>
                    {isLoading ? '—' : s.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ready_for_billing">Ready for Billing</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                    const used = usage[client.id] || 0;
                    const limit = client.plan_minutes || 0;
                    const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
                    const stage = STAGE_STYLES[client.pipeline_stage || ''] || { label: client.pipeline_stage || 'Unknown', variant: 'outline' as const };

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
                              <Progress
                                value={pct}
                                className={cn('h-2', getBarColor(pct))}
                              />
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
                              <DropdownMenuItem onClick={() => navigate(`/admin/leads/${client.id}`)}>
                                View Billing
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
    </div>
  );
}
