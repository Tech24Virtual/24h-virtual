import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface BreakBreakdown {
  lunchMinutes: number;
  bathroomActualMinutes: number;
  bathroomDeductedMinutes: number;
  bathroomAllowanceMinutes: number;
}

interface SubmitInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  totalBreakMinutes: number;
  netHours: number;
  breakBreakdown?: BreakBreakdown | null;
}

export function SubmitInvoiceDialog({
  open, onOpenChange, periodStart, periodEnd, totalHours, totalBreakMinutes, netHours, breakBreakdown,
}: SubmitInvoiceDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('shift_invoices').insert({
        agent_id:            user!.id,
        period_start:        format(periodStart, 'yyyy-MM-dd'),
        period_end:          format(periodEnd, 'yyyy-MM-dd'),
        total_hours:         totalHours,
        total_break_minutes: totalBreakMinutes,
        net_hours:           netHours,
        agent_notes:         notes || null,
        status:              'submitted',
        submitted_at:        new Date().toISOString(),
      });
      if (error) throw error;

      // Notify all supervisors so the Pending tab badge lights up
      const { data: supervisors } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor');

      if (supervisors?.length) {
        await (supabase as any).from('notifications').insert(
          supervisors.map((s: { user_id: string }) => ({
            user_id:    s.user_id,
            title:      'New Shift Invoice Submitted',
            message:    `${profile?.full_name || 'An agent'} has submitted a shift invoice for review.`,
            category:   'billing',
            action_url: '/staff/supervisor/shift-reviews',
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast.success('Invoice submitted. Your supervisor has been notified.');
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit invoice.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Pay Period Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Period</p>
              <p className="font-medium">{format(periodStart, 'MMM d')} – {format(periodEnd, 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net Billable Hours</p>
              <p className="font-medium">{netHours.toFixed(2)} hrs</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Hours</p>
              <p className="font-medium">{totalHours.toFixed(2)} hrs</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Deducted</p>
              <p className="font-medium">
                {breakBreakdown
                  ? `${breakBreakdown.lunchMinutes + breakBreakdown.bathroomDeductedMinutes} min`
                  : `${totalBreakMinutes} min`}
              </p>
            </div>
          </div>

          {breakBreakdown && (breakBreakdown.lunchMinutes > 0 || breakBreakdown.bathroomActualMinutes > 0) && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Break Breakdown</p>
              {breakBreakdown.lunchMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lunch Break</span>
                  <span className="font-medium">
                    {breakBreakdown.lunchMinutes} min{' '}
                    <span className="text-muted-foreground font-normal text-xs">(deducted)</span>
                  </span>
                </div>
              )}
              {breakBreakdown.bathroomActualMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bathroom Break</span>
                  <span className="font-medium">
                    {breakBreakdown.bathroomActualMinutes} min{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      ({breakBreakdown.bathroomDeductedMinutes} min deducted,{' '}
                      {breakBreakdown.bathroomAllowanceMinutes} min allowance per break)
                    </span>
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 font-semibold">
                <span>Total Deducted</span>
                <span>{breakBreakdown.lunchMinutes + breakBreakdown.bathroomDeductedMinutes} min</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any comments about this pay period..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
