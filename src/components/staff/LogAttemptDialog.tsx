import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';

interface LogAttemptDialogProps {
  open: boolean;
  onClose: () => void;
  request: {
    id: string;
    contact_name: string;
    contact_phone: string;
    reason: string | null;
    attempt_count: number;
    max_attempts: number;
    claimed_by: string | null;
  };
  handlerRole?: string;
}

const CALL_OUTCOMES = [
  { value: 'completed',    label: 'Call Complete',  description: 'No follow up needed',             requiresFollowUp: false, icon: '✅' },
  { value: 'no_answer',   label: 'No Answer',       description: 'Follow up needed',                requiresFollowUp: true,  icon: '📵' },
  { value: 'voicemail',   label: 'Voicemail Left',  description: 'Follow up needed',                requiresFollowUp: true,  icon: '📬' },
  { value: 'busy',        label: 'Busy',            description: 'Follow up needed',                requiresFollowUp: true,  icon: '🔄' },
  { value: 'wrong_number', label: 'Wrong Number',   description: 'Creates task for correct number', requiresFollowUp: false, icon: '❌' },
  { value: 'follow_up',   label: 'Follow Up',       description: 'Follow up needed',                requiresFollowUp: true,  icon: '📋' },
] as const;

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LogAttemptDialog({ open, onClose, request, handlerRole }: LogAttemptDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const defaultCallback = toLocalDatetimeValue(new Date(Date.now() + 60 * 60 * 1000));
  const [scheduledCallbackAt, setScheduledCallbackAt] = useState(defaultCallback);

  const nextAttempt = request.attempt_count + 1;
  const selectedOutcome = CALL_OUTCOMES.find((o) => o.value === outcome);
  const requiresFollowUp = selectedOutcome?.requiresFollowUp ?? false;

  const handleClose = () => {
    setOutcome('');
    setNotes('');
    setScheduledCallbackAt(defaultCallback);
    onClose();
  };

  const handleSave = async () => {
    if (!user || !outcome) {
      toast.error('Please select an outcome');
      return;
    }
    if (requiresFollowUp && !scheduledCallbackAt) {
      toast.error('Please choose a callback date/time');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      let newStatus: string;
      let scheduledCbAt: string | null = null;

      if (outcome === 'completed') {
        newStatus = 'completed';
      } else if (outcome === 'wrong_number') {
        newStatus = 'failed';
      } else if (requiresFollowUp) {
        newStatus = 'pending';
        scheduledCbAt = scheduledCallbackAt
          ? new Date(scheduledCallbackAt).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString();
      } else {
        newStatus = 'pending';
      }

      // Insert attempt record with digital signature
      await (supabase as any).from('outbound_call_attempts').insert({
        request_id: request.id,
        agent_id: user.id,
        agent_name: profile?.full_name || user.email || 'Agent',
        attempt_number: nextAttempt,
        outcome,
        notes: notes.trim() || null,
        retry_scheduled_for: scheduledCbAt,
        handler_id: user.id,
        handler_name: profile?.full_name || null,
        handler_role: handlerRole || null,
      });

      // Build update payload
      const updateData: Record<string, unknown> = {
        status: newStatus,
        attempt_count: nextAttempt,
        last_attempt_at: now.toISOString(),
        last_attempt_outcome: outcome,
        current_handler_id: null,
      };

      if (newStatus === 'completed') {
        updateData.completed_at = now.toISOString();
        updateData.outcome = outcome;
        updateData.outcome_notes = notes.trim() || null;
        updateData.claimed_by = null;
        updateData.claimed_at = null;
        updateData.scheduled_callback_at = null;
        // Trigger post-call SMS (fire-and-forget)
        supabase.functions.invoke('trigger-post-call-notification', {
          body: { request_id: request.id },
        }).catch(() => {});
      } else if (newStatus === 'failed') {
        updateData.completed_at = now.toISOString();
        updateData.outcome = outcome;
        updateData.outcome_notes = notes.trim() || null;
        updateData.claimed_by = null;
        updateData.claimed_at = null;
        updateData.scheduled_callback_at = null;
      } else if (requiresFollowUp) {
        // Re-queue with scheduled callback time — clear owner so any agent can pick it up
        updateData.scheduled_callback_at = scheduledCbAt;
        updateData.next_retry_at = null;
        updateData.claimed_by = null;
        updateData.claimed_at = null;
      }

      const { error } = await supabase
        .from('outbound_call_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      // wrong_number → task to get the correct number
      if (outcome === 'wrong_number') {
        (async () => {
          try {
            await supabase.from('crm_tasks').insert({
              title: `Get correct phone number — ${request.contact_name}`,
              description: `Wrong number was called for outbound request. Please get the correct number from the client.`,
              assigned_to: request.claimed_by || null,
              created_by: user?.id ?? null,
              status: 'pending',
              priority: 'high',
              visibility: 'universal',
            });
          } catch {}
        })();
      }

      const toastMsg =
        outcome === 'completed'    ? 'Call completed!' :
        outcome === 'wrong_number' ? 'Marked as wrong number — task created' :
        requiresFollowUp           ? `Callback scheduled for ${new Date(scheduledCbAt!).toLocaleString()}` :
                                     'Attempt logged';

      toast.success(toastMsg);
      queryClient.invalidateQueries({ queryKey: ['outbound-requests'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-stats'] });
      handleClose();
    } catch (err) {
      console.error('Error logging attempt:', err);
      toast.error('Failed to log attempt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Call — {request.contact_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Attempt {nextAttempt} of {request.max_attempts}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Outcome cards */}
          <div className="space-y-2">
            <Label>Call Outcome <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-1 gap-2">
              {CALL_OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    outcome === o.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                  }`}
                >
                  <span className="text-lg leading-none">{o.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.description}</p>
                  </div>
                  {outcome === o.value && (
                    <Badge variant="default" className="shrink-0 text-xs">Selected</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Callback scheduler — shown for follow-up outcomes */}
          {requiresFollowUp && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <Label htmlFor="callback-at" className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Schedule callback for <span className="text-destructive">*</span>
              </Label>
              <input
                id="callback-at"
                type="datetime-local"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={scheduledCallbackAt}
                onChange={(e) => setScheduledCallbackAt(e.target.value)}
                min={toLocalDatetimeValue(new Date())}
              />
              <p className="text-xs text-muted-foreground">
                This call will reappear in the queue at the scheduled time.
              </p>
            </div>
          )}

          {/* Wrong number warning */}
          {outcome === 'wrong_number' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-medium text-destructive">A task will be created to get the correct number.</p>
              <p className="text-xs text-muted-foreground mt-0.5">This request will be marked as failed.</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="attempt-notes">
              Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Textarea
              id="attempt-notes"
              placeholder={outcome === 'completed' ? 'Summary of the call...' : 'Any additional notes...'}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !outcome}>
            {isSaving ? 'Saving...' : 'Log Attempt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
