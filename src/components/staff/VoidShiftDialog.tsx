import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface VoidShiftDialogProps {
  shiftId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoidShiftDialog({ shiftId, open, onOpenChange }: VoidShiftDialogProps) {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const voidMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('agent_shifts')
        .update({ status: 'voided', void_reason: reason })
        .eq('id', shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-shifts'] });
      toast({ title: 'Shift voided', description: 'The shift has been marked as voided.' });
      setReason('');
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to void shift.', variant: 'destructive' });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Void Shift
          </AlertDialogTitle>
          <AlertDialogDescription>
            This shift will be permanently marked as voided. It cannot be undone or deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason (minimum 10 characters) *</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this shift is being voided..."
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => voidMutation.mutate()}
            disabled={reason.trim().length < 10 || voidMutation.isPending}
          >
            Void Shift
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
