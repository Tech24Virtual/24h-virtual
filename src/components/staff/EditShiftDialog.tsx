import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from '@/hooks/use-toast';

interface EditShiftDialogProps {
  shift: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    manual_deduction_minutes?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditShiftDialog({ shift, open, onOpenChange }: EditShiftDialogProps) {
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
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast({ title: 'Shift updated', description: 'Clock times have been adjusted.' });
      setReason('');
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update shift.', variant: 'destructive' });
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
            Adjust clock-in/out for power outages, internet loss, etc. A reason is required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-clock-in">Clock In</Label>
            <Input
              id="edit-clock-in"
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </div>
          {shift.clock_out && (
            <div className="space-y-2">
              <Label htmlFor="edit-clock-out">Clock Out</Label>
              <Input
                id="edit-clock-out"
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="deduct-minutes">Deduct Minutes (optional)</Label>
            <Input
              id="deduct-minutes"
              type="number"
              min={0}
              max={maxDeduction || undefined}
              value={deductMinutes}
              onChange={(e) => setDeductMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Minutes to subtract from this shift (e.g., power outage, internet loss).
              {maxDeduction > 0 && ` Max: ${maxDeduction} min.`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-reason">Reason (minimum 10 characters) *</Label>
            <Textarea
              id="edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Lost power at 2:30 PM, actual work ended at 2:15 PM..."
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
