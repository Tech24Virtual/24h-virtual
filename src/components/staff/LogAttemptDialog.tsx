import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface LogAttemptDialogProps {
  open: boolean;
  onClose: () => void;
  request: {
    id: string;
    contact_name: string;
    attempt_count: number;
    max_attempts: number;
  };
}

const RETRY_INTERVALS = [
  { label: '15 minutes', value: '15' },
  { label: '30 minutes', value: '30' },
  { label: '1 hour', value: '60' },
  { label: '2 hours', value: '120' },
  { label: '4 hours', value: '240' },
];

export function LogAttemptDialog({ open, onClose, request }: LogAttemptDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [retryInterval, setRetryInterval] = useState('30');
  const [skipRetry, setSkipRetry] = useState(false);

  const nextAttempt = request.attempt_count + 1;
  const isMaxReached = nextAttempt >= request.max_attempts;
  const showRetryOptions = ['no_answer', 'voicemail', 'busy'].includes(outcome) && !isMaxReached;

  const getDefaultInterval = () => {
    if (nextAttempt <= 1) return '30';
    if (nextAttempt === 2) return '120';
    return '240';
  };

  const handleSave = async () => {
    if (!user || !outcome) {
      toast.error('Please select an outcome');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      let retryAt: string | null = null;
      let newStatus = 'in_progress';

      if (outcome === 'connected') {
        newStatus = 'completed';
      } else if (outcome === 'wrong_number') {
        newStatus = 'failed';
      } else if (isMaxReached || skipRetry) {
        newStatus = 'failed';
      } else {
        newStatus = 'retry_pending';
        const intervalMinutes = parseInt(retryInterval || getDefaultInterval());
        retryAt = new Date(now.getTime() + intervalMinutes * 60 * 1000).toISOString();
      }

      // Insert attempt record
      await supabase.from('outbound_call_attempts').insert({
        request_id: request.id,
        agent_id: user.id,
        agent_name: profile?.full_name || user.email || 'Agent',
        attempt_number: nextAttempt,
        outcome,
        notes: notes.trim() || null,
        retry_scheduled_for: retryAt,
      });

      // Update request record
      const updateData: Record<string, unknown> = {
        status: newStatus,
        attempt_count: nextAttempt,
        last_attempt_at: now.toISOString(),
        last_attempt_outcome: outcome,
      };

      if (retryAt) updateData.next_retry_at = retryAt;
      if (newStatus === 'completed') {
        updateData.completed_at = now.toISOString();
        updateData.outcome = outcome;
        updateData.outcome_notes = notes.trim() || null;

        // Trigger Reach59 post-call SMS notification (fire-and-forget)
        supabase.functions.invoke('trigger-post-call-notification', {
          body: { request_id: request.id },
        }).then(({ error: notifyError }) => {
          if (notifyError) {
            console.warn('Reach59 notification failed (non-blocking):', notifyError);
          }
        });
      }
      if (newStatus === 'failed') {
        updateData.completed_at = now.toISOString();
        updateData.outcome = isMaxReached ? 'no_answer_max_retries' : outcome;
        updateData.outcome_notes = notes.trim() || null;
      }

      const { error } = await supabase
        .from('outbound_call_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      toast.success(
        outcome === 'connected'
          ? 'Call completed!'
          : newStatus === 'retry_pending'
          ? 'Retry scheduled'
          : 'Request marked as ' + newStatus
      );

      queryClient.invalidateQueries({ queryKey: ['outbound-requests'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-stats'] });
      setOutcome('');
      setNotes('');
      setSkipRetry(false);
      onClose();
    } catch (error) {
      console.error('Error logging attempt:', error);
      toast.error('Failed to log attempt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Log Call Attempt — {request.contact_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Attempt {nextAttempt} of {request.max_attempts}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Call Outcome *</Label>
            <RadioGroup value={outcome} onValueChange={setOutcome} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="connected" id="connected" />
                <Label htmlFor="connected" className="cursor-pointer">✅ Connected</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no_answer" id="no_answer" />
                <Label htmlFor="no_answer" className="cursor-pointer">📵 No Answer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="voicemail" id="voicemail" />
                <Label htmlFor="voicemail" className="cursor-pointer">📩 Voicemail Left</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="busy" id="busy" />
                <Label htmlFor="busy" className="cursor-pointer">🔴 Busy</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wrong_number" id="wrong_number" />
                <Label htmlFor="wrong_number" className="cursor-pointer">❌ Wrong Number</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder={outcome === 'connected' ? 'Summary of the call...' : 'Any additional notes...'}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {showRetryOptions && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <Label>Schedule Retry</Label>
              <Select value={retryInterval} onValueChange={setRetryInterval}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {RETRY_INTERVALS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setSkipRetry(true)}
              >
                No more retries — mark as failed
              </Button>
              {skipRetry && (
                <p className="text-xs text-destructive">
                  Request will be marked as failed. 
                  <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setSkipRetry(false)}>
                    Undo
                  </Button>
                </p>
              )}
            </div>
          )}

          {isMaxReached && ['no_answer', 'voicemail', 'busy'].includes(outcome) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                Maximum attempts ({request.max_attempts}) reached. This request will be marked as failed.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !outcome}>
            {isSaving ? 'Saving...' : 'Log Attempt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
