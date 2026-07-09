import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInMinutes, setDate, isAfter, isBefore, addMonths } from 'date-fns';
import { Clock, Ban, CheckCircle, Pencil, AlertCircle, Send, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { ShiftClockWidget } from '@/components/staff/ShiftClockWidget';
import { VoidShiftDialog } from '@/components/staff/VoidShiftDialog';
import { EditShiftDialog } from '@/components/staff/EditShiftDialog';
import { PayPeriodSummary } from '@/components/staff/PayPeriodSummary';
import { SubmitInvoiceDialog } from '@/components/staff/SubmitInvoiceDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { calcBreakDeductionMinutes } from '@/lib/shiftBreaks';
import { getPayCycleBounds, type PayCycleBounds } from '@/lib/payCycle';

const statusConfig: Record<string, { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  completed: { label: 'Completed', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  approved:  { label: 'Approved',  className: 'bg-green-100 text-green-800 border border-green-200' },
  voided:    { label: 'Voided',    className: 'bg-red-100 text-red-800 border border-red-200' },
};

// Generate semi-monthly pay periods (last 6 months), reusing the shared cycle-bounds math from payCycle.ts
function generatePayPeriods(): PayCycleBounds[] {
  const periods: PayCycleBounds[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const month = addMonths(now, -Math.floor(i / 2));
    // Alternates 16th-end / 1st-15th of the same month, matching the original ordering.
    const refDate = i % 2 === 0 ? setDate(month, 16) : setDate(month, 1);
    periods.push(getPayCycleBounds(refDate));
  }
  return periods;
}

export default function AgentShifts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [voidShiftId, setVoidShiftId] = useState<string | null>(null);
  const [editShift, setEditShift] = useState<{ id: string; clock_in: string; clock_out: string | null; manual_deduction_minutes?: number } | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pastPeriodsOpen, setPastPeriodsOpen] = useState(false);

  const payPeriods = useMemo(() => generatePayPeriods(), []);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const selectedPeriod = payPeriods[selectedPeriodIdx];

  const { data: breaksPaidSetting } = useQuery({
    queryKey: ['admin-setting-breaks-paid'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_settings').select('value').eq('key', 'breaks_paid').maybeSingle();
      return data?.value === true || data?.value === 'true';
    },
  });

  // Fetch agent's banking config for break_policy and employment_type
  const { data: agentBanking } = useQuery({
    queryKey: ['agent-banking-config', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('agent_banking').select('break_policy, employment_type').eq('agent_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Resolve effective breaksPaid based on per-agent policy
  const breaksPaid = (() => {
    const policy = agentBanking?.break_policy ?? 'global';
    if (policy === 'paid') return true;
    if (policy === 'unpaid') return false;
    return breaksPaidSetting ?? false;
  })();

  const isContractor = agentBanking?.employment_type === 'contractor';

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['agent-shifts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_shifts').select('*').eq('agent_id', user!.id).order('clock_in', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: invoices } = useQuery({
    queryKey: ['shift-invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_invoices').select('*').eq('agent_id', user!.id).order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: breakSettings = [] } = useQuery<{ setting_key: string; setting_value: string }[]>({
    queryKey: ['shift-break-settings'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('shift_break_settings')
        .select('setting_key, setting_value');
      return data ?? [];
    },
  });

  const bathroomAllowance = parseInt(
    breakSettings.find((s) => s.setting_key === 'bathroom_break_allowance_minutes')?.setting_value ?? '5',
  );

  const shiftIds = useMemo(() => shifts?.map((s) => s.id) ?? [], [shifts]);

  const { data: periodBreaks = [] } = useQuery<
    { shift_id: string; break_type: string | null; started_at: string; ended_at: string }[]
  >({
    queryKey: ['period-breaks', shiftIds],
    queryFn: async () => {
      if (!shiftIds.length) return [];
      const { data } = await (supabase as any)
        .from('agent_shift_breaks')
        .select('shift_id, break_type, started_at, ended_at')
        .in('shift_id', shiftIds)
        .not('ended_at', 'is', null);
      return data ?? [];
    },
    enabled: shiftIds.length > 0,
  });

  const breaksByShift = useMemo(() => {
    const map = new Map<string, typeof periodBreaks>();
    for (const b of periodBreaks) {
      if (!map.has(b.shift_id)) map.set(b.shift_id, []);
      map.get(b.shift_id)!.push(b);
    }
    return map;
  }, [periodBreaks]);

  const calcBreakDeduction = useCallback(
    (shiftId: string): number =>
      calcBreakDeductionMinutes(breaksByShift.get(shiftId) ?? [], bathroomAllowance, breaksPaid),
    [breaksByShift, bathroomAllowance, breaksPaid],
  );

  const approveMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase.from('agent_shifts')
        .update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast.success('Shift approved. Hours confirmed for payroll.');
    },
    onError: () => toast.error('Failed to approve shift.'),
  });

  // Bulk approve all completed shifts in the period (for contractors)
  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const completedIds = periodShifts.filter(s => s.status === 'completed').map(s => s.id);
      if (!completedIds.length) return;
      const { error } = await supabase.from('agent_shifts')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .in('id', completedIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast.success('All completed shifts in this period have been approved.');
    },
    onError: () => toast.error('Failed to bulk approve.'),
  });

  // Filter shifts for selected period
  const periodShifts = useMemo(() => {
    if (!shifts || !selectedPeriod) return [];
    return shifts.filter(s => {
      const d = new Date(s.clock_in);
      return !isBefore(d, selectedPeriod.start) && !isAfter(d, new Date(selectedPeriod.end.getTime() + 86400000 - 1));
    });
  }, [shifts, selectedPeriod]);

  // Check if current period already has a submitted invoice
  const currentInvoice = useMemo(() => {
    if (!invoices || !selectedPeriod) return null;
    return invoices.find(inv =>
      inv.period_start === format(selectedPeriod.start, 'yyyy-MM-dd') &&
      inv.period_end === format(selectedPeriod.end, 'yyyy-MM-dd')
    );
  }, [invoices, selectedPeriod]);

  const pastInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => inv.status !== 'submitted' || inv.period_start !== format(selectedPeriod.start, 'yyyy-MM-dd'));
  }, [invoices, selectedPeriod]);

  const calcDuration = (shift: any) => {
    if (!shift.clock_out) return '—';
    const totalMins = differenceInMinutes(new Date(shift.clock_out), new Date(shift.clock_in));
    const deduction = shift.manual_deduction_minutes || 0;
    // Lunch (always) and bathroom (excess only) deduct regardless of breaksPaid;
    // only the raw fallback for shifts with no per-break rows honors breaksPaid.
    const breakDeduct = breaksByShift.has(shift.id)
      ? calcBreakDeduction(shift.id)
      : (breaksPaid ? 0 : (shift.total_break_minutes ?? 0));
    const netMins = Math.max(0, totalMins - breakDeduct - deduction);
    return `${Math.floor(netMins / 60)}h ${netMins % 60}m`;
  };

  // Calculate totals for submit dialog
  const approvedPeriodShifts = periodShifts.filter(s => s.status === 'approved');
  const totalMins = approvedPeriodShifts.reduce((acc, s) => {
    if (!s.clock_out) return acc;
    return acc + differenceInMinutes(new Date(s.clock_out), new Date(s.clock_in));
  }, 0);
  const totalBreakMins = approvedPeriodShifts.reduce((acc, s) => acc + (s.total_break_minutes ?? 0), 0);
  const totalDeductMins = approvedPeriodShifts.reduce((acc, s) => acc + (s.manual_deduction_minutes ?? 0), 0);
  const netMins = approvedPeriodShifts.reduce((acc, s) => {
    if (!s.clock_out) return acc;
    const rawMins = differenceInMinutes(new Date(s.clock_out), new Date(s.clock_in));
    const deduction = s.manual_deduction_minutes || 0;
    const breakDeduct = breaksByShift.has(s.id)
      ? calcBreakDeduction(s.id)
      : (breaksPaid ? 0 : (s.total_break_minutes ?? 0));
    return acc + Math.max(0, rawMins - breakDeduct - deduction);
  }, 0);

  const breakBreakdown = (() => {
    // Lunch and bathroom deduction always applies, independent of breaksPaid.
    let lunchMinutes = 0;
    let bathroomActualMinutes = 0;
    let bathroomDeductedMinutes = 0;
    for (const s of approvedPeriodShifts) {
      for (const b of breaksByShift.get(s.id) ?? []) {
        if (!b.started_at || !b.ended_at) continue;
        const mins = (new Date(b.ended_at).getTime() - new Date(b.started_at).getTime()) / 60000;
        if (b.break_type === 'lunch') {
          lunchMinutes += mins;
        } else if (b.break_type === 'bathroom') {
          bathroomActualMinutes += mins;
          bathroomDeductedMinutes += Math.max(0, mins - bathroomAllowance);
        }
      }
    }
    return {
      lunchMinutes: Math.round(lunchMinutes),
      bathroomActualMinutes: Math.round(bathroomActualMinutes),
      bathroomDeductedMinutes: Math.round(bathroomDeductedMinutes),
      bathroomAllowanceMinutes: bathroomAllowance,
    };
  })();

  const invoiceStatusBadge: Record<string, { label: string; className: string }> = {
    submitted: { label: 'Submitted', className: 'bg-amber-100 text-amber-800' },
    supervisor_approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
    paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  };

  return (
    <StaffLayout role="agent">
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shift History</h1>
            <p className="text-muted-foreground">View and manage your shift records</p>
          </div>
        </div>

        <div className="flex items-start gap-6 flex-wrap">
          <div className="max-w-xs">
            <ShiftClockWidget />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Pay Period</label>
            <Select value={String(selectedPeriodIdx)} onValueChange={(v) => setSelectedPeriodIdx(Number(v))}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {payPeriods.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <PayPeriodSummary
          shifts={periodShifts}
          breaksPaid={breaksPaid}
          breaksByShift={breaksByShift}
          bathroomAllowance={bathroomAllowance}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedPeriod.label}
              {breaksPaid && <Badge variant="outline" className="ml-2 text-xs">Breaks Paid</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Breaks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !periodShifts.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No shifts in this period</TableCell></TableRow>
                ) : (
                  periodShifts.map((shift) => {
                    const cfg = statusConfig[shift.status] || statusConfig.completed;
                    const isEdited = !!shift.edited_at;
                    return (
                      <TableRow key={shift.id} className={shift.status === 'voided' ? 'opacity-60 line-through' : ''}>
                        <TableCell>{format(new Date(shift.clock_in), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {format(new Date(shift.clock_in), 'h:mm a')}
                          {isEdited && (
                            <Tooltip>
                              <TooltipTrigger><AlertCircle className="h-3 w-3 text-amber-500 inline ml-1" /></TooltipTrigger>
                              <TooltipContent className="max-w-xs">Edited: {shift.edit_reason}</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{shift.clock_out ? format(new Date(shift.clock_out), 'h:mm a') : '—'}</TableCell>
                        <TableCell>{calcDuration(shift)}</TableCell>
                        <TableCell>
                          {breaksByShift.has(shift.id) ? (
                            <div className="space-y-0.5">
                              {(breaksByShift.get(shift.id) ?? []).map((b, i) => {
                                const mins = b.ended_at && b.started_at
                                  ? Math.round((new Date(b.ended_at).getTime() - new Date(b.started_at).getTime()) / 60000)
                                  : 0;
                                const icon = b.break_type === 'lunch' ? '🍽️' : b.break_type === 'bathroom' ? '🚻' : '⏸️';
                                return <span key={i} className="block text-xs">{icon} {mins}m</span>;
                              })}
                            </div>
                          ) : (
                            <span>{shift.total_break_minutes || 0} min</span>
                          )}
                          {(shift.manual_deduction_minutes || 0) > 0 && (
                            <span className="block text-xs text-orange-600">-{shift.manual_deduction_minutes}m deducted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {shift.status === 'voided' && shift.void_reason ? (
                            <Tooltip>
                              <TooltipTrigger><Badge className={cfg.className}>{cfg.label}</Badge></TooltipTrigger>
                              <TooltipContent className="max-w-xs">{shift.void_reason}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge className={cfg.className}>{cfg.label}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {shift.status === 'completed' && !currentInvoice && (
                            <div className="flex gap-1">
                              {!isContractor && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => approveMutation.mutate(shift.id)} disabled={approveMutation.isPending}>
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Approve</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => setEditShift({ id: shift.id, clock_in: shift.clock_in, clock_out: shift.clock_out, manual_deduction_minutes: shift.manual_deduction_minutes })}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => setVoidShiftId(shift.id)}>
                                    <Ban className="h-3 w-3 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Void</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Contractor bulk approve */}
            {isContractor && !currentInvoice && periodShifts.some(s => s.status === 'completed') && (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => bulkApproveMutation.mutate()} disabled={bulkApproveMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve All Hours
                </Button>
              </div>
            )}

            {/* Submit button */}
            {!currentInvoice && approvedPeriodShifts.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Send className="h-4 w-4 mr-2" /> Submit for Review
                </Button>
              </div>
            )}
            {currentInvoice && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
                <Badge className={invoiceStatusBadge[currentInvoice.status]?.className}>
                  {invoiceStatusBadge[currentInvoice.status]?.label || currentInvoice.status}
                </Badge>
                <span className="ml-2 text-muted-foreground">
                  Submitted {format(new Date(currentInvoice.submitted_at), 'MMM d, h:mm a')}
                </span>
                {currentInvoice.supervisor_notes && (
                  <p className="mt-1 text-destructive text-xs">Supervisor: {currentInvoice.supervisor_notes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past submitted periods */}
        {pastInvoices.length > 0 && (
          <Collapsible open={pastPeriodsOpen} onOpenChange={setPastPeriodsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                Past Periods ({pastInvoices.length})
                <ChevronDown className={`h-4 w-4 transition-transform ${pastPeriodsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {pastInvoices.map(inv => (
                  <div key={inv.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">{Number(inv.net_hours).toFixed(2)} net hrs</p>
                    </div>
                    <Badge className={invoiceStatusBadge[inv.status]?.className}>
                      {invoiceStatusBadge[inv.status]?.label || inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {voidShiftId && <VoidShiftDialog shiftId={voidShiftId} open={!!voidShiftId} onOpenChange={(open) => !open && setVoidShiftId(null)} />}
        {editShift && <EditShiftDialog shift={editShift} open={!!editShift} onOpenChange={(open) => !open && setEditShift(null)} />}
        {showSubmitDialog && selectedPeriod && (
          <SubmitInvoiceDialog
            open={showSubmitDialog}
            onOpenChange={setShowSubmitDialog}
            periodStart={selectedPeriod.start}
            periodEnd={selectedPeriod.end}
            totalHours={totalMins / 60}
            totalBreakMinutes={totalBreakMins}
            netHours={netMins / 60}
            breakBreakdown={breakBreakdown}
          />
        )}
      </div>
      </div>
    </StaffLayout>
  );
}
