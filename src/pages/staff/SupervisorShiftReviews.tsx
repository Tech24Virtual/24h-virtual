import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addBusinessDays } from 'date-fns';
import { FileCheck, CheckCircle, XCircle, ChevronDown, ChevronUp, Pencil, Clock, Banknote } from 'lucide-react';
import { SupervisorEditShiftDialog } from '@/components/staff/SupervisorEditShiftDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'draft' | 'submitted' | 'supervisor_approved' | 'paid' | 'rejected';

const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:                { label: 'Draft',          variant: 'outline' },
  submitted:            { label: 'Pending Review', variant: 'default' },
  supervisor_approved:  { label: 'Approved',       variant: 'outline' },
  paid:                 { label: 'Paid',            variant: 'secondary' },
  rejected:             { label: 'Rejected',        variant: 'destructive' },
};

export default function SupervisorShiftReviews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editShift, setEditShift] = useState<{
    id: string; clock_in: string; clock_out: string | null; manual_deduction_minutes?: number;
  } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['shift-invoices-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_invoices')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['agent-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });

  const { data: invoiceShifts = [] } = useQuery({
    queryKey: ['invoice-shifts', expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const invoice = invoices?.find(i => i.id === expandedId);
      if (!invoice) return [];
      const { data } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', invoice.agent_id)
        .gte('clock_in', invoice.period_start)
        .lte('clock_in', invoice.period_end + 'T23:59:59')
        .in('status', ['approved', 'completed'])
        .order('clock_in', { ascending: true });
      return data ?? [];
    },
    enabled: !!expandedId,
  });

  // ── Derived state ─────────────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    all:                  invoices?.length ?? 0,
    draft:                invoices?.filter(i => i.status === 'draft').length ?? 0,
    submitted:            invoices?.filter(i => i.status === 'submitted').length ?? 0,
    supervisor_approved:  invoices?.filter(i => i.status === 'supervisor_approved').length ?? 0,
    paid:                 invoices?.filter(i => i.status === 'paid').length ?? 0,
    rejected:             invoices?.filter(i => i.status === 'rejected').length ?? 0,
  }), [invoices]);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (statusFilter === 'all') return invoices;
    return invoices.filter(i => i.status === statusFilter);
  }, [invoices, statusFilter]);

  const getAgentName = (agentId: string) => {
    const p = profiles.find(p => p.id === agentId);
    return p?.full_name ?? agentId.slice(0, 8);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const invoice = invoices?.find(i => i.id === invoiceId);
      const payoutDate = addBusinessDays(new Date(), 7);
      const payoutDateStr = format(payoutDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('shift_invoices')
        .update({
          status: 'supervisor_approved',
          supervisor_id: user!.id,
          supervisor_approved_at: new Date().toISOString(),
          payout_date: payoutDateStr,
        })
        .eq('id', invoiceId);
      if (error) throw error;

      if (invoice) {
        await (supabase as any).from('notifications').insert({
          user_id:    invoice.agent_id,
          title:      'Shift Invoice Approved',
          message:    `Your shift invoice for ${format(new Date(invoice.period_start), 'MMM d')}–${format(new Date(invoice.period_end), 'MMM d, yyyy')} has been approved. Payout scheduled for ${format(payoutDate, 'MMM d, yyyy')}.`,
          type:       'invoice',
          category:   'billing',
          action_url: '/staff/agent/shifts',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices-all'] });
      toast.success('Invoice approved. Payout scheduled for 7 business days.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const invoice = invoices?.find(i => i.id === invoiceId);

      const { error } = await supabase
        .from('shift_invoices')
        .update({
          status: 'rejected' as any,
          supervisor_id: user!.id,
          supervisor_notes: reason,
        })
        .eq('id', invoiceId);
      if (error) throw error;

      if (invoice) {
        await (supabase as any).from('notifications').insert({
          user_id:    invoice.agent_id,
          title:      'Shift Invoice Rejected',
          message:    `Your shift invoice for ${format(new Date(invoice.period_start), 'MMM d')}–${format(new Date(invoice.period_end), 'MMM d, yyyy')} was rejected. Reason: ${reason}`,
          type:       'invoice',
          category:   'billing',
          action_url: '/staff/agent/shifts',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices-all'] });
      setRejectDialog(null);
      setRejectReason('');
      toast.success('Invoice rejected. Agent has been notified.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">

        {/* Gradient header */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Shift Invoice Reviews</h1>
              <p className="text-muted-foreground mt-0.5">Review and approve agent pay period submissions</p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-10 mb-1" /> : <p className="text-2xl font-bold">{counts.submitted}</p>}
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-10 mb-1" /> : <p className="text-2xl font-bold">{counts.supervisor_approved}</p>}
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-10 mb-1" /> : <p className="text-2xl font-bold">{counts.paid}</p>}
                  <p className="text-sm text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-10 mb-1" /> : <p className="text-2xl font-bold">{counts.rejected}</p>}
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status filter tabs */}
        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              All
              {counts.all > 0 && <Badge variant="secondary" className="h-4 px-1 text-xs">{counts.all}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="submitted" className="gap-1.5">
              Pending
              {counts.submitted > 0 && <Badge className="h-4 px-1 text-xs bg-amber-500">{counts.submitted}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-1.5">
              Drafts
              {counts.draft > 0 && <Badge variant="outline" className="h-4 px-1 text-xs">{counts.draft}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="supervisor_approved" className="gap-1.5">
              Approved
              {counts.supervisor_approved > 0 && <Badge variant="secondary" className="h-4 px-1 text-xs">{counts.supervisor_approved}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-1.5">
              Paid
              {counts.paid > 0 && <Badge variant="secondary" className="h-4 px-1 text-xs">{counts.paid}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              Rejected
              {counts.rejected > 0 && <Badge variant="destructive" className="h-4 px-1 text-xs">{counts.rejected}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Invoice list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-14 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No invoices found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((inv) => {
              const cfg = statusBadge[inv.status] ?? statusBadge.submitted;
              const isExpanded = expandedId === inv.id;
              return (
                <Collapsible
                  key={inv.id}
                  open={isExpanded}
                  onOpenChange={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div className="border rounded-lg p-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-left">
                          <div>
                            <p className="font-medium">{getAgentName(inv.agent_id)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{Number(inv.net_hours).toFixed(2)}</span>
                            <span className="text-muted-foreground"> net hrs</span>
                          </div>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {inv.status === 'submitted' && (
                            <>
                              <Button
                                size="sm" variant="outline"
                                onClick={(e) => { e.stopPropagation(); approveMutation.mutate(inv.id); }}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Approve
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                onClick={(e) => { e.stopPropagation(); setRejectDialog(inv.id); }}
                              >
                                <XCircle className="h-4 w-4 mr-1 text-destructive" /> Reject
                              </Button>
                            </>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-4 space-y-3">

                        {/* Rejection reason */}
                        {inv.status === 'rejected' && inv.supervisor_notes && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                            <p className="text-sm text-red-700 mt-0.5">{inv.supervisor_notes}</p>
                          </div>
                        )}

                        {/* Payout info */}
                        {inv.status === 'supervisor_approved' && inv.payout_date && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-green-800">
                              Payout scheduled: {format(new Date(inv.payout_date), 'MMM d, yyyy')}
                              {inv.payout_amount != null && ` · $${Number(inv.payout_amount).toFixed(2)}`}
                            </p>
                          </div>
                        )}

                        {/* Paid info */}
                        {inv.status === 'paid' && inv.paid_at && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-blue-800">
                              Paid {format(new Date(inv.paid_at), 'MMM d, yyyy')}
                              {inv.payout_amount != null && ` · $${Number(inv.payout_amount).toFixed(2)}`}
                            </p>
                            {inv.airwallex_transfer_id && (
                              <p className="text-xs text-blue-600 mt-0.5 font-mono">{inv.airwallex_transfer_id}</p>
                            )}
                          </div>
                        )}

                        {/* Agent notes */}
                        {inv.agent_notes && (
                          <div className="bg-muted/50 rounded-md p-3 text-sm">
                            <p className="font-medium text-xs text-muted-foreground mb-1">Agent Notes</p>
                            <p>{inv.agent_notes}</p>
                          </div>
                        )}

                        {/* Summary grid */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Hours: </span>
                            <span className="font-medium">{Number(inv.total_hours).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Break Time: </span>
                            <span className="font-medium">{inv.total_break_minutes} min</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submitted: </span>
                            <span className="font-medium">{format(new Date(inv.submitted_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>

                        {/* Shift breakdown table */}
                        {invoiceShifts.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Clock In</TableHead>
                                <TableHead>Clock Out</TableHead>
                                <TableHead>Breaks</TableHead>
                                <TableHead className="w-12" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoiceShifts.map(s => (
                                <TableRow key={s.id}>
                                  <TableCell>{format(new Date(s.clock_in), 'MMM d')}</TableCell>
                                  <TableCell>{format(new Date(s.clock_in), 'h:mm a')}</TableCell>
                                  <TableCell>{s.clock_out ? format(new Date(s.clock_out), 'h:mm a') : '—'}</TableCell>
                                  <TableCell>{s.total_break_minutes} min</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost" size="sm"
                                      onClick={() => setEditShift({
                                        id: s.id,
                                        clock_in: s.clock_in,
                                        clock_out: s.clock_out,
                                        manual_deduction_minutes: s.manual_deduction_minutes,
                                      })}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={open => { if (!open) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection <span className="text-muted-foreground font-normal">(min. 10 characters)</span></Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this invoice is being rejected…"
              rows={3}
            />
            {rejectReason.length > 0 && rejectReason.trim().length < 10 && (
              <p className="text-xs text-destructive">{10 - rejectReason.trim().length} more characters required</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectReason.trim().length < 10 || rejectMutation.isPending}
              onClick={() => rejectDialog && rejectMutation.mutate({ invoiceId: rejectDialog, reason: rejectReason })}
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit shift dialog */}
      {editShift && (
        <SupervisorEditShiftDialog
          shift={editShift}
          open={!!editShift}
          onOpenChange={open => { if (!open) setEditShift(null); }}
        />
      )}
    </StaffLayout>
  );
}
