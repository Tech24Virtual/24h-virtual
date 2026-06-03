import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface SubmitInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  totalBreakMinutes: number;
  netHours: number;
}

export function SubmitInvoiceDialog({
  open, onOpenChange, periodStart, periodEnd, totalHours, totalBreakMinutes, netHours
}: SubmitInvoiceDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('shift_invoices').insert({
        agent_id: user!.id,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        total_hours: totalHours,
        total_break_minutes: totalBreakMinutes,
        net_hours: netHours,
        agent_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast({ title: 'Invoice submitted', description: 'Your shift invoice has been sent for supervisor review.' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to submit invoice.', variant: 'destructive' });
    },
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
              <p className="text-muted-foreground">Break Time</p>
              <p className="font-medium">{totalBreakMinutes} min</p>
            </div>
          </div>
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
            {submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
