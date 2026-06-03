import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addBusinessDays } from 'date-fns';
import { FileCheck, CheckCircle, XCircle, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { SupervisorEditShiftDialog } from '@/components/staff/SupervisorEditShiftDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';

const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  submitted: { label: 'Pending Review', variant: 'default' },
  supervisor_approved: { label: 'Approved', variant: 'outline' },
  paid: { label: 'Paid', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export default function SupervisorShiftReviews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editShift, setEditShift] = useState<{ id: string; clock_in: string; clock_out: string | null; manual_deduction_minutes?: number } | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['shift-invoices-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_invoices')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch agent profiles for display names
  const { data: profiles } = useQuery({
    queryKey: ['agent-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    },
  });

  const getAgentName = (agentId: string) => {
    const p = profiles?.find(p => p.id === agentId);
    return p?.full_name || agentId.slice(0, 8);
  };

  // Fetch shifts for expanded invoice
  const { data: invoiceShifts } = useQuery({
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
        .eq('status', 'approved')
        .order('clock_in', { ascending: true });
      return data || [];
    },
    enabled: !!expandedId,
  });

  const approveMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const payoutDate = addBusinessDays(new Date(), 7);
      const { error } = await supabase
        .from('shift_invoices')
        .update({
          status: 'supervisor_approved',
          supervisor_id: user!.id,
          supervisor_approved_at: new Date().toISOString(),
          payout_date: format(payoutDate, 'yyyy-MM-dd'),
        })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices-all'] });
      toast({ title: 'Invoice approved', description: 'Payout scheduled for 7 business days.' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { error } = await supabase
        .from('shift_invoices')
        .update({
          status: 'rejected' as any,
          supervisor_id: user!.id,
          supervisor_notes: reason,
        })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices-all'] });
      setRejectDialog(null);
      setRejectReason('');
      toast({ title: 'Invoice rejected', description: 'Agent has been notified.' });
    },
  });

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Shift Invoice Reviews</h1>
          <p className="text-muted-foreground">Review and approve agent pay period submissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              All Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : !invoices?.length ? (
              <p className="text-center py-8 text-muted-foreground">No invoices submitted yet</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => {
                  const cfg = statusBadge[inv.status] || statusBadge.submitted;
                  const isExpanded = expandedId === inv.id;
                  return (
                    <Collapsible key={inv.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : inv.id)}>
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
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); approveMutation.mutate(inv.id); }} disabled={approveMutation.isPending}>
                                    <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRejectDialog(inv.id); }}>
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
                            {inv.agent_notes && (
                              <div className="bg-muted/50 rounded-md p-3 text-sm">
                                <p className="font-medium text-xs text-muted-foreground mb-1">Agent Notes</p>
                                <p>{inv.agent_notes}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div><span className="text-muted-foreground">Total Hours:</span> <span className="font-medium">{Number(inv.total_hours).toFixed(2)}</span></div>
                              <div><span className="text-muted-foreground">Break Time:</span> <span className="font-medium">{inv.total_break_minutes} min</span></div>
                              <div><span className="text-muted-foreground">Submitted:</span> <span className="font-medium">{format(new Date(inv.submitted_at), 'MMM d, h:mm a')}</span></div>
                            </div>
                            {invoiceShifts && invoiceShifts.length > 0 && (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Clock In</TableHead>
                                    <TableHead>Clock Out</TableHead>
                                    <TableHead>Breaks</TableHead>
                                    <TableHead className="w-12">Edit</TableHead>
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
                                        <Button variant="ghost" size="sm" onClick={() => setEditShift({ id: s.id, clock_in: s.clock_in, clock_out: s.clock_out, manual_deduction_minutes: s.manual_deduction_minutes })}>
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
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Reason for rejection</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectDialog && rejectMutation.mutate({ invoiceId: rejectDialog, reason: rejectReason })}>
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {editShift && <SupervisorEditShiftDialog shift={editShift} open={!!editShift} onOpenChange={(open) => !open && setEditShift(null)} />}
      </div>
    </StaffLayout>
  );
}
