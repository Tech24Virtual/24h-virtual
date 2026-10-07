import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle, DollarSign, Info, Landmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  PAYMENT_METHOD_LABELS, calcPayoutAmount, canProcessAutomatically, describeRate,
  type AgentPayoutProfile,
} from '@/lib/billing/payout';

type ShiftInvoice = Tables<'shift_invoices'>;

interface AgentPayoutSheetProps {
  invoice: ShiftInvoice | null;
  profile: AgentPayoutProfile | undefined;
  agentName: string;
  onClose: () => void;
  onProcess: (invoiceId: string) => void;
  processing: boolean;
}

const money = (n: number | null | undefined, currency = 'USD') => {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="font-medium text-right break-words">{children}</span>
  </div>
);

export function AgentPayoutSheet({ invoice, profile, agentName, onClose, onProcess, processing }: AgentPayoutSheetProps) {
  const queryClient = useQueryClient();
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['agent-invoice-history', invoice?.agent_id],
    enabled: !!invoice,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_invoices').select('*').eq('agent_id', invoice!.agent_id).order('period_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const gross = invoice ? calcPayoutAmount(invoice, profile) : null;

  useEffect(() => {
    if (markPaidOpen && gross?.amount != null) setPaidAmount(gross.amount.toFixed(2));
    if (!markPaidOpen) setPaidAmount('');
  }, [markPaidOpen, gross?.amount]);

  const markPaid = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(paidAmount);
      if (!(amount > 0)) throw new Error('Enter the amount that was paid');
      // .select() so a row blocked by RLS (0 rows updated) surfaces as an error instead of silent success
      const { data, error } = await supabase
        .from('shift_invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString(), payout_amount: amount })
        .eq('id', invoice!.id)
        .eq('status', 'supervisor_approved')
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Invoice was not updated — it may already be paid or no longer approved');
    },
    onSuccess: () => {
      toast.success('Invoice marked as paid');
      setMarkPaidOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payout-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['agent-invoice-history'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPending = invoice?.status === 'supervisor_approved';
  const auto = canProcessAutomatically(profile);
  const currency = profile?.currency || 'USD';
  const methodLabel = profile?.payment_method ? (PAYMENT_METHOD_LABELS[profile.payment_method] ?? profile.payment_method) : null;

  let cannotAutoReason: string | null = null;
  if (isPending && !auto) {
    if (!profile?.has_banking) cannotAutoReason = 'No banking details on file.';
    else if (profile.pay_type === 'monthly') cannotAutoReason = 'Automatic payouts only support hourly pay. Pay this agent manually, then use Mark as Paid.';
    else cannotAutoReason = 'No hourly rate set.';
  }

  return (
    <>
      <Sheet open={!!invoice} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{agentName}</SheetTitle>
            <SheetDescription>Payout detail</SheetDescription>
          </SheetHeader>

          {invoice && (
            <div className="mt-6 space-y-5">
              {/* Pay terms */}
              <section>
                <h3 className="text-sm font-semibold mb-1">Pay</h3>
                <Row label="Pay type"><Badge variant="outline" className="capitalize">{profile?.pay_type ?? 'hourly'}</Badge></Row>
                <Row label="Rate">{describeRate(profile) ?? <span className="text-destructive">Not set</span>}</Row>
                {profile?.pay_type === 'monthly' && (
                  <>
                    <Row label="Hours threshold">{profile.hours_per_month ? `${profile.hours_per_month} h / month` : '—'}</Row>
                    <Row label="Overtime rate">{profile.overtime_hourly_rate ? `$${profile.overtime_hourly_rate.toFixed(2)} / hr` : '—'}</Row>
                  </>
                )}
              </section>

              <Separator />

              {/* Banking (masked) */}
              <section>
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Landmark className="h-4 w-4" /> Banking</h3>
                {!profile?.has_banking ? (
                  <p className="text-sm text-orange-700">No banking details on file.</p>
                ) : (
                  <>
                    <Row label="Method">{methodLabel ?? '—'}</Row>
                    {profile.payment_method === 'e_transfer' ? (
                      <Row label="Payment email">{profile.e_transfer_email ?? '—'}</Row>
                    ) : (
                      <>
                        <Row label="Bank">{profile.bank_name ?? '—'}</Row>
                        <Row label="Account">{profile.account_last4 ? `•••• ${profile.account_last4}` : '—'}</Row>
                        <Row label="Routing / transit">{profile.routing_masked ?? '—'}</Row>
                      </>
                    )}
                    <Row label="Currency">{[profile.currency, profile.country].filter(Boolean).join(' · ') || '—'}</Row>
                  </>
                )}
              </section>

              <Separator />

              {/* This invoice */}
              <section>
                <h3 className="text-sm font-semibold mb-1">This period</h3>
                <Row label="Period">
                  {format(new Date(invoice.period_start), 'MMM d')} – {format(new Date(invoice.period_end), 'MMM d, yyyy')}
                </Row>
                <Row label="Hours worked">{Number(invoice.total_hours).toFixed(2)}</Row>
                <Row label="Break time">{invoice.total_break_minutes} min</Row>
                <Row label="Net hours">{Number(invoice.net_hours).toFixed(2)}</Row>
                <Row label="Gross amount">
                  {gross?.amount != null ? money(gross.amount, currency) : '—'}
                  {gross?.basis === 'monthly' && <span className="block text-[11px] font-normal text-muted-foreground">monthly rate{gross.overtimeAmount > 0 ? ` + ${money(gross.overtimeAmount, currency)} overtime` : ''}</span>}
                  {gross?.basis === 'hourly' && <span className="block text-[11px] font-normal text-muted-foreground">net hours × hourly rate</span>}
                  {gross?.basis === 'recorded' && <span className="block text-[11px] font-normal text-muted-foreground">recorded payout</span>}
                </Row>
                <Row label="Status"><StatusBadge status={invoice.status} /></Row>
                {invoice.paid_at && <Row label="Paid">{format(new Date(invoice.paid_at), 'MMM d, yyyy')}</Row>}
                {invoice.airwallex_transfer_id && <Row label="Transfer ID"><span className="font-mono text-xs">{invoice.airwallex_transfer_id}</span></Row>}
                {invoice.agent_notes && <Row label="Agent notes">{invoice.agent_notes}</Row>}
                {invoice.supervisor_notes && <Row label="Supervisor notes">{invoice.supervisor_notes}</Row>}
              </section>

              {/* Actions */}
              {isPending && (
                <section className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={!auto || processing} onClick={() => onProcess(invoice.id)}>
                      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                      Process Payout
                    </Button>
                    <Button variant="outline" onClick={() => setMarkPaidOpen(true)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                    </Button>
                  </div>
                  {cannotAutoReason && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {cannotAutoReason}
                    </p>
                  )}
                </section>
              )}

              <Separator />

              {/* History */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Invoice history</h3>
                {historyLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => {
                      const amt = calcPayoutAmount(h, profile);
                      return (
                        <div key={h.id} className={`flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm ${h.id === invoice.id ? 'bg-accent/50' : ''}`}>
                          <div>
                            <p className="font-medium">
                              {format(new Date(h.period_start), 'MMM d')} – {format(new Date(h.period_end), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">{Number(h.net_hours).toFixed(2)} net h</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{amt.amount != null ? money(amt.amount, currency) : '—'}</p>
                            <StatusBadge status={h.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This records a payment you made outside the system. <strong>No transfer is sent.</strong> The invoice moves to
              "paid" with the amount below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="paid-amount">Amount paid ({currency})</Label>
            <Input id="paid-amount" type="number" step="0.01" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            {profile?.pay_type === 'monthly' && (
              <p className="text-xs text-muted-foreground">
                Monthly pay: shift invoices cover short periods, so check whether this amount should be prorated.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markPaid.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={markPaid.isPending || !(parseFloat(paidAmount) > 0)}
              onClick={(e) => { e.preventDefault(); markPaid.mutate(); }}
            >
              {markPaid.isPending ? 'Saving…' : 'Mark as Paid'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
