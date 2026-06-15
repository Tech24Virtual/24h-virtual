import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GitCompare, AlertTriangle, Clock, CheckCircle, Loader2, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// ─── types ────────────────────────────────────────────────────────────────────

interface VarianceRow {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  variance_type: string;
  expected_minutes: number;
  actual_minutes: number;
  delta_minutes: number;
  delta_pct: number;
  status: string;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  mission_id: string | null;
  raw_details: Record<string, unknown> | null;
  created_at: string;
  client: { name: string | null; company: string | null; custom_minute_rate: number | null } | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const VARIANCE_TYPE_LABELS: Record<string, string> = {
  call_log_vs_usage_record: 'Call Log vs Usage Record',
  usage_record_vs_billing_summary: 'Usage Record vs Billing',
  duplicate_call_id: 'Duplicate Call ID',
  five9_gap: 'Five9 Gap',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-700',
};

function clientLabel(row: VarianceRow) {
  return row.client?.name || row.client?.company || row.raw_details?.client_name || row.client_id.slice(0, 8);
}

function fmtMinutes(n: number | null) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)} min`;
}

function fmtPct(n: number | null) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)}%`;
}

// ─── Pull Five9 Reports button / dialog ──────────────────────────────────────

function PullFive9ReportsButton({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMonth = subMonths(new Date(), 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pull-five9-call-report', {
        body: { period_start: periodStart, period_end: periodEnd },
      });
      if (error) throw error;

      toast({
        title: 'Five9 pull complete',
        description: `${data?.clients_processed ?? 0} client(s) processed, ${data?.new_rows ?? 0} new call log row(s) added.`,
      });
      setOpen(false);
      onDone();
    } catch (err) {
      toast({ title: 'Five9 pull failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="gap-2"
        data-testid="pull-five9-reports-btn"
      >
        <Download className="w-4 h-4" />
        Pull Five9 Reports
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="pull-five9-dialog">
          <DialogHeader>
            <DialogTitle>Pull Five9 Call Reports</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fetches call log data from Five9 for all active clients with campaign mappings
              and upserts new records into call_logs, skipping any already captured by webhook.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  data-testid="five9-period-start"
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  data-testid="five9-period-end"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleRun} disabled={loading} data-testid="confirm-pull-five9-btn">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Pull Reports
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Run Reconciliation button / dialog ──────────────────────────────────────

function RunReconciliationButton({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMonth = subMonths(new Date(), 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-usage', {
        body: { period_start: periodStart, period_end: periodEnd },
      });
      if (error) throw error;

      if (data?.status === 'blocked') {
        toast({ title: 'Agent blocked', description: 'UsageReconciliationAgent is disabled in Mission Control.', variant: 'destructive' });
      } else {
        toast({
          title: 'Reconciliation complete',
          description: `${data?.clients_processed ?? 0} client(s) checked, ${data?.variances_found ?? 0} variance(s) found.`,
        });
      }
      setOpen(false);
      onDone();
    } catch (err) {
      toast({ title: 'Reconciliation failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2"
        data-testid="run-reconciliation-btn"
      >
        <GitCompare className="w-4 h-4" />
        Run Reconciliation
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="run-reconciliation-dialog">
          <DialogHeader>
            <DialogTitle>Run Usage Reconciliation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compares call_logs vs usage_records vs billing_summaries for each active client and
              flags discrepancies greater than 5% into the variance queue.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  data-testid="recon-period-start"
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  data-testid="recon-period-end"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleRun} disabled={loading} data-testid="confirm-run-reconciliation-btn">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Resolve / Dismiss dialog ─────────────────────────────────────────────────

interface ActionDialogProps {
  mode: 'resolve' | 'dismiss' | null;
  varianceId: string | null;
  onClose: () => void;
  onDone: () => void;
}

function ActionDialog({ mode, varianceId, onClose, onDone }: ActionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!varianceId || !mode) return;
    if (!notes.trim()) {
      toast({ title: `${mode === 'resolve' ? 'Resolution notes' : 'Dismiss reason'} required`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('variance_queue')
        .update({
          status: mode === 'resolve' ? 'resolved' : 'dismissed',
          resolved_by: user!.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes.trim(),
        })
        .eq('id', varianceId);

      if (error) throw error;

      toast({ title: mode === 'resolve' ? 'Variance resolved' : 'Variance dismissed' });
      setNotes('');
      onDone();
      onClose();
    } catch (err) {
      toast({ title: 'Update failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!mode && !!varianceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid={mode === 'resolve' ? 'resolve-dialog' : 'dismiss-dialog'}>
        <DialogHeader>
          <DialogTitle>{mode === 'resolve' ? 'Resolve Variance' : 'Dismiss Variance'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {mode === 'resolve'
              ? 'Describe how this variance was resolved.'
              : 'Provide a reason for dismissing this variance.'}
          </p>
          <Textarea
            placeholder={mode === 'resolve' ? 'Resolution notes...' : 'Dismiss reason...'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            data-testid="resolution-notes-input"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !notes.trim()}
            variant={mode === 'dismiss' ? 'secondary' : 'default'}
            data-testid={mode === 'resolve' ? 'confirm-resolve-btn' : 'confirm-dismiss-btn'}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'resolve' ? 'Resolve' : 'Dismiss'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingReconciliation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const lastMonth = subMonths(new Date(), 1);
  const [periodMonth, setPeriodMonth] = useState(format(lastMonth, 'yyyy-MM'));
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('open');

  // Action dialog state
  const [actionMode, setActionMode] = useState<'resolve' | 'dismiss' | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const periodStart = `${periodMonth}-01`;
  const periodEnd = format(endOfMonth(new Date(`${periodMonth}-01`)), 'yyyy-MM-dd');

  const { data: rows, isLoading } = useQuery({
    queryKey: ['variance-queue', periodMonth, filterClient, filterType, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('variance_queue')
        .select('*, client:client_id(name, company, custom_minute_rate)')
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd)
        .order('created_at', { ascending: false });

      if (filterClient !== 'all') query = query.eq('client_id', filterClient);
      if (filterType !== 'all') query = query.eq('variance_type', filterType);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VarianceRow[];
    },
  });

  // Unique clients for filter dropdown
  const { data: allClients } = useQuery({
    queryKey: ['variance-queue-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('variance_queue')
        .select('client_id, client:client_id(name, company)')
        .limit(200);
      const seen = new Set<string>();
      type ClientRow = { client_id: string; client: { name: string | null; company: string | null } | null };
      return (data || []).filter((r: ClientRow) => {
        if (seen.has(r.client_id)) return false;
        seen.add(r.client_id);
        return true;
      }) as Array<{ client_id: string; client: { name: string | null; company: string | null } | null }>;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('variance_queue')
        .update({ assigned_to: user!.id, status: 'under_review' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-queue'] });
      toast({ title: 'Assigned to you' });
    },
    onError: (err) => toast({ title: 'Assign failed', description: String(err), variant: 'destructive' }),
  });

  const invalidateQueue = () => queryClient.invalidateQueries({ queryKey: ['variance-queue'] });

  // Summary stats (computed from open rows across all filters except status)
  const openRows = (rows || []).filter((r) => r.status === 'open' || r.status === 'under_review');
  const totalOpenVariances = openRows.length;
  const totalMinutesAtRisk = openRows.reduce((s, r) => s + Math.abs(Number(r.delta_minutes) || 0), 0);
  const estimatedDollarRisk = openRows.reduce((s, r) => {
    const rate = r.client?.custom_minute_rate ?? 1.39;
    return s + Math.abs(Number(r.delta_minutes) || 0) * rate;
  }, 0);

  return (
    <StaffLayout role="billing">
      <div className="space-y-6" data-testid="reconciliation-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usage Reconciliation</h1>
            <p className="text-muted-foreground">Variance queue — review discrepancies between call logs, usage records, and billing summaries</p>
          </div>
          <div className="flex gap-2">
            <PullFive9ReportsButton onDone={invalidateQueue} />
            <RunReconciliationButton onDone={invalidateQueue} />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Variances</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <div className="text-2xl font-bold" data-testid="open-variance-count">{totalOpenVariances}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Minutes at Risk</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold" data-testid="minutes-at-risk">{totalMinutesAtRisk.toFixed(1)} min</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated $ at Risk</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold" data-testid="dollars-at-risk">${estimatedDollarRisk.toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end" data-testid="variance-filters">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Period</Label>
            <Input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-40"
              data-testid="filter-period"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Client</Label>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-44" data-testid="filter-client">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {(allClients || []).map((c) => (
                  <SelectItem key={c.client_id} value={c.client_id}>
                    {c.client?.name || c.client?.company || c.client_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-52" data-testid="filter-type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(VARIANCE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36" data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !rows?.length ? (
              <div className="py-16 text-center text-muted-foreground" data-testid="empty-state">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
                <p className="font-medium">No open variances — all usage records are reconciled</p>
                <p className="text-sm mt-1">Run a reconciliation or adjust the filters above.</p>
              </div>
            ) : (
              <Table data-testid="variance-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead className="text-right">Δ%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} data-testid="variance-row">
                      <TableCell className="font-medium">{clientLabel(row)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {row.period_start} → {row.period_end}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap text-xs">
                          {VARIANCE_TYPE_LABELS[row.variance_type] || row.variance_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMinutes(row.expected_minutes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMinutes(row.actual_minutes)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <span className={Number(row.delta_minutes) < 0 ? 'text-green-600' : 'text-destructive'}>
                          {Number(row.delta_minutes) >= 0 ? '+' : ''}{fmtMinutes(row.delta_minutes)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={Math.abs(Number(row.delta_pct)) > 20 ? 'text-destructive font-semibold' : ''}>
                          {fmtPct(row.delta_pct)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[row.status] || ''}>
                          {row.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.assigned_to
                          ? row.assigned_to === user?.id
                            ? 'You'
                            : row.assigned_to.slice(0, 8) + '…'
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {row.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={assignMutation.isPending}
                              onClick={() => assignMutation.mutate(row.id)}
                              data-testid={`assign-btn-${row.id}`}
                            >
                              Assign to me
                            </Button>
                          )}
                          {(row.status === 'open' || row.status === 'under_review') && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={() => { setActionMode('resolve'); setActionId(row.id); }}
                                data-testid={`resolve-btn-${row.id}`}
                              >
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => { setActionMode('dismiss'); setActionId(row.id); }}
                                data-testid={`dismiss-btn-${row.id}`}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {(row.status === 'resolved' || row.status === 'dismissed') && (
                            <span className="text-xs text-muted-foreground italic">
                              {row.resolved_at ? format(new Date(row.resolved_at), 'MMM d') : '—'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ActionDialog
          mode={actionMode}
          varianceId={actionId}
          onClose={() => { setActionMode(null); setActionId(null); }}
          onDone={invalidateQueue}
        />
      </div>
    </StaffLayout>
  );
}
