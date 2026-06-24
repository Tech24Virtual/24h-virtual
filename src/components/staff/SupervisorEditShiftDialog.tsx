import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SupervisorEditShiftDialogProps {
  shift: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    manual_deduction_minutes?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupervisorEditShiftDialog({ shift, open, onOpenChange }: SupervisorEditShiftDialogProps) {
  const { user } = useAuth();
  const [clockIn, setClockIn] = useState(
    format(new Date(shift.clock_in), "yyyy-MM-dd'T'HH:mm")
  );
  const [clockOut, setClockOut] = useState(
    shift.clock_out ? format(new Date(shift.clock_out), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [deductMinutes, setDeductMinutes] = useState(shift.manual_deduction_minutes ?? 0);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const maxDeduction = clockOut
    ? Math.max(0, differenceInMinutes(new Date(clockOut), new Date(clockIn)))
    : 0;

  const editMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        clock_in: new Date(clockIn).toISOString(),
        original_clock_in: shift.clock_in,
        edit_reason: reason,
        edited_at: new Date().toISOString(),
        edited_by: user!.id,
        manual_deduction_minutes: deductMinutes,
      };
      if (clockOut) {
        updates.clock_out = new Date(clockOut).toISOString();
        updates.original_clock_out = shift.clock_out;
      }
      const { error } = await supabase
        .from('agent_shifts')
        .update(updates)
        .eq('id', shift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-invoices-all'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-shifts'] });
      toast.success('Shift updated. Clock times have been adjusted.');
      setReason('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to update shift.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Shift Times
          </DialogTitle>
          <DialogDescription>
            Adjust clock-in/out for power outages, internet loss, etc. A reason is required. The agent will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sup-edit-clock-in">Clock In</Label>
            <Input
              id="sup-edit-clock-in"
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </div>
          {shift.clock_out && (
            <div className="space-y-2">
              <Label htmlFor="sup-edit-clock-out">Clock Out</Label>
              <Input
                id="sup-edit-clock-out"
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="sup-deduct-minutes">Deduct Minutes (optional)</Label>
            <Input
              id="sup-deduct-minutes"
              type="number"
              min={0}
              max={maxDeduction || undefined}
              value={deductMinutes}
              onChange={(e) => setDeductMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Minutes to subtract from this shift.
              {maxDeduction > 0 && ` Max: ${maxDeduction} min.`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-edit-reason">Reason (minimum 10 characters) *</Label>
            <Textarea
              id="sup-edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Agent lost power at 2:30 PM, actual work ended at 2:15 PM..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => editMutation.mutate()}
            disabled={reason.trim().length < 10 || !clockIn || editMutation.isPending || (deductMinutes > maxDeduction && maxDeduction > 0)}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
