import { useState } from 'react';
import { addMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

export interface ChurnTargetClient {
  id: string;
  name: string;
  wl_partner_id: string | null;
}

interface Props {
  client: ChurnTargetClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the DB update succeeds, so callers can invalidate queries. */
  onChurned?: (clientId: string) => void;
}

/**
 * Confirms + records a client churn. WL-sourced clients get a
 * wl_churn_contact_eligible_at set 3 months out — the partner-exclusivity
 * window before 24H can re-engage them directly (enforced by the
 * wl-churn-eligibility-check cron job, which flips them to re_engage once
 * that date passes).
 */
export function MarkClientChurnedDialog({ client, open, onOpenChange, onChurned }: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  function handleOpenChange(next: boolean) {
    if (busy) return;
    if (!next) setReason('');
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!client) return;
    setBusy(true);
    try {
      const isWlSourced = !!client.wl_partner_id;
      const { error } = await supabase
        .from('leads')
        .update({
          pipeline_stage: 'churned',
          churned_at: new Date().toISOString(),
          churn_reason: reason.trim() || null,
          ...(isWlSourced
            ? { wl_churn_contact_eligible_at: addMonths(new Date(), 3).toISOString() }
            : {}),
        })
        .eq('id', client.id);
      if (error) throw error;

      toast.success('Client marked as churned', {
        description: isWlSourced
          ? 'WL partner exclusivity window (3 months) applied before re-engage is eligible.'
          : undefined,
      });
      setReason('');
      onOpenChange(false);
      onChurned?.(client.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark client as churned');
    } finally {
      setBusy(false);
    }
  }

  if (!client) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this client as churned?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{client.name}</span> will move out of
            Active Accounts into the Re-Engage pipeline.
            {client.wl_partner_id && (
              <>
                {' '}This client came from a white-label partner, so a 3-month exclusivity window
                will apply before it becomes eligible for direct re-engagement.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="churn-reason">Churn reason (optional)</Label>
          <Textarea
            id="churn-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. switched providers, budget cuts, went out of business..."
            rows={3}
            disabled={busy}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Marking as churned…
              </>
            ) : (
              'Mark as Churned'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MarkClientChurnedDialog;
