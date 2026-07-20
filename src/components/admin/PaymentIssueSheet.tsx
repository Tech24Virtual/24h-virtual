import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle, CreditCard, Mail, RotateCcw, CalendarClock, Ban,
  CheckCircle2, XCircle, Loader2, User,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentIssueSheetProps {
  issueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive' },
  retrying: { label: 'Retrying', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  needs_attention: { label: 'Needs Attention', className: 'bg-destructive text-destructive-foreground' },
  resolved: { label: 'Resolved', className: 'bg-cta/10 text-cta' },
  cancelled: { label: 'Retries Cancelled', className: 'bg-muted text-muted-foreground' },
};

const FAILURE_CODE_LABELS: Record<string, string> = {
  card_declined: 'Card Declined',
  insufficient_funds: 'Insufficient Funds',
  expired_card: 'Expired Card',
  processing_error: 'Processing Error',
  declined: 'Declined',
  error: 'Gateway Error',
};

export function PaymentIssueSheet({ issueId, open, onOpenChange }: PaymentIssueSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: issue, isLoading } = useQuery({
    queryKey: ['payment-issue', issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_failures')
        .select('*, leads:lead_id (id, name, email, company, user_id, nmi_card_last_four, nmi_card_type)')
        .eq('id', issueId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['payment-issue-attempts', issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_failure_attempts')
        .select('*')
        .eq('payment_failure_id', issueId!)
        .order('attempted_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-issue', issueId] });
    queryClient.invalidateQueries({ queryKey: ['payment-issue-attempts', issueId] });
    queryClient.invalidateQueries({ queryKey: ['payment-failures'] });
    queryClient.invalidateQueries({ queryKey: ['payment-failures-count'] });
  };

  const retryNowMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('retry-failed-payment', {
        body: { payment_failure_id: issueId },
      });
      if (error) throw error;
      return data as { success: boolean; message?: string };
    },
    onSuccess: (data) => {
      invalidateAll();
      if (data?.success) {
        toast({ title: 'Payment succeeded', description: 'The retry went through.' });
      } else {
        toast({
          title: 'Retry failed',
          description: data?.message ?? 'The charge was declined again.',
          variant: 'destructive',
        });
      }
    },
    onError: (err: unknown) => toast({
      title: 'Error',
      description: err instanceof Error ? err.message : 'Failed to retry payment',
      variant: 'destructive',
    }),
  });

  const scheduleRetryMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleDate) throw new Error('Pick a date first');
      const [hh, mm] = scheduleTime.split(':').map(Number);
      const dt = new Date(scheduleDate);
      dt.setHours(hh || 0, mm || 0, 0, 0);
      const { error } = await supabase
        .from('payment_failures')
        .update({ next_retry_at: dt.toISOString(), status: 'failed', retry_cancelled: false })
        .eq('id', issueId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Retry scheduled' });
      setScheduleOpen(false);
    },
    onError: () => toast({ title: 'Failed to schedule retry', variant: 'destructive' }),
  });

  const cancelRetriesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('payment_failures')
        .update({ retry_cancelled: true, status: 'cancelled', next_retry_at: null })
        .eq('id', issueId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Auto-retry cancelled' });
      setCancelDialogOpen(false);
    },
    onError: () => toast({ title: 'Failed to cancel retries', variant: 'destructive' }),
  });

  const sendPaymentUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!issue) throw new Error('No issue loaded');
      // NMI has no self-serve billing portal — notify the client in-app
      // directly rather than relying on the Stripe-only card-update flow.
      if (issue.leads?.user_id) {
        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: issue.leads.user_id,
          title: 'Action Required — Update Payment Method',
          message: 'A recent payment failed. Please update your payment method to avoid service interruption.',
          category: 'billing',
          action_url: '/client-dashboard/billing',
        });
        if (notifErr) throw notifErr;
      }
      const { error } = await supabase
        .from('payment_failures')
        .update({
          payment_update_sent_at: new Date().toISOString(),
          payment_update_sent_count: (issue.payment_update_sent_count ?? 0) + 1,
        })
        .eq('id', issue.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Payment update link sent to client' });
    },
    onError: () => toast({ title: 'Failed to send payment update link', variant: 'destructive' }),
  });

  const lead = issue?.leads as
    | { id: string; name: string; email: string; company: string | null; user_id: string | null; nmi_card_last_four: string | null; nmi_card_type: string | null }
    | null
    | undefined;
  const statusInfo = issue ? (STATUS_LABELS[issue.status ?? 'failed'] ?? STATUS_LABELS.failed) : null;
  const needsEscalation = issue?.status === 'needs_attention' || (issue?.retry_count ?? 0) >= 3;
  const canRetry = issue && !['resolved', 'cancelled'].includes(issue.status ?? 'failed');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Payment Issue
          </SheetTitle>
          <SheetDescription>Failure detail, retry history, and resolution actions.</SheetDescription>
        </SheetHeader>

        {isLoading || !issue ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Client + status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{lead?.name ?? 'Unknown client'}</p>
                  <p className="text-sm text-muted-foreground">
                    {lead?.company || lead?.email}
                  </p>
                </div>
              </div>
              {statusInfo && <Badge className={statusInfo.className}>{statusInfo.label}</Badge>}
            </div>

            {/* Amount / date / reason */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">
                  {issue.amount != null ? `$${Number(issue.amount).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Failed</span>
                <span>{format(new Date(issue.failed_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reason</span>
                <Badge variant="destructive" className="text-xs">
                  {FAILURE_CODE_LABELS[issue.failure_code ?? ''] || issue.failure_code || 'Unknown'}
                </Badge>
              </div>
              {issue.failure_message && (
                <p className="text-xs text-muted-foreground pt-1">{issue.failure_message}</p>
              )}
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-muted-foreground">Retry attempts</span>
                <span className="font-medium">{issue.retry_count ?? 0} of 3</span>
              </div>
              {(lead?.nmi_card_last_four) && (
                <div className="flex items-center gap-2 text-sm pt-1">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{lead.nmi_card_type ?? 'Card'} •••• {lead.nmi_card_last_four}</span>
                </div>
              )}
            </div>

            {/* Escalated banner + prominent send-link */}
            {needsEscalation && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {(issue.retry_count ?? 0) >= 3
                    ? '3 failed attempts — automatic retries have stopped'
                    : 'Automatic retries have stopped — no charge amount on record'}
                </p>
                <Button
                  className="w-full"
                  onClick={() => sendPaymentUpdateMutation.mutate()}
                  disabled={sendPaymentUpdateMutation.isPending}
                >
                  {sendPaymentUpdateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Payment Update Link
                </Button>
                {issue.payment_update_sent_count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sent {issue.payment_update_sent_count}x
                    {issue.payment_update_sent_at && ` — last ${format(new Date(issue.payment_update_sent_at), 'MMM d, h:mm a')}`}
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-2">
              <Label>Timeline</Label>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p>Attempt 1 — Failed</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(issue.failed_at), 'MMM d, h:mm a')}
                      {issue.failure_message ? ` — ${issue.failure_message}` : ''}
                    </p>
                  </div>
                </div>
                {attempts.map((a, i) => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    {a.result === 'succeeded' ? (
                      <CheckCircle2 className="h-4 w-4 text-cta mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p>Attempt {i + 2} — {a.result === 'succeeded' ? 'Succeeded' : 'Failed'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.attempted_at), 'MMM d, h:mm a')}
                        {a.error_message ? ` — ${a.error_message}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {issue.next_retry_at && canRetry && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <CalendarClock className="h-3 w-3" />
                  Next retry {format(new Date(issue.next_retry_at), 'MMM d, h:mm a')}
                </p>
              )}
            </div>

            {/* Actions */}
            {canRetry && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => retryNowMutation.mutate()}
                    disabled={retryNowMutation.isPending}
                  >
                    {retryNowMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Retry Now
                  </Button>
                  <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <CalendarClock className="h-4 w-4 mr-2" />
                        Schedule Retry
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 space-y-3" align="end">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                      <div className="space-y-1.5">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={!scheduleDate || scheduleRetryMutation.isPending}
                        onClick={() => scheduleRetryMutation.mutate()}
                      >
                        Confirm
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>

                {!needsEscalation && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => sendPaymentUpdateMutation.mutate()}
                    disabled={sendPaymentUpdateMutation.isPending}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Payment Update Link
                  </Button>
                )}

                {issue.status !== 'cancelled' && !issue.retry_cancelled && (
                  <Button
                    variant="ghost"
                    className={cn('w-full text-muted-foreground')}
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Retries
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel auto-retry?</AlertDialogTitle>
              <AlertDialogDescription>
                This stops all further automatic retry attempts for this payment issue. You can
                still retry manually or send a payment update link afterward.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep retrying</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelRetriesMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel Retries
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

export default PaymentIssueSheet;
