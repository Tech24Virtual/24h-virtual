import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarOff, Thermometer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeOffRequestDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState<'day_off' | 'sick'>('day_off');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('time_off_requests').insert({
        agent_id: user!.id,
        request_type: type,
        start_date: startDate,
        end_date: endDate || startDate,
        reason: reason || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      toast({ title: type === 'sick' ? 'Sick day reported' : 'Time off requested', description: 'Your supervisor has been notified.' });
      setStartDate(''); setEndDate(''); setReason(''); setType('day_off');
      onOpenChange(false);
    },
    onError: () => toast({ title: 'Error', description: 'Failed to submit request.', variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Request Time Off</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={type} onValueChange={(v) => setType(v as 'day_off' | 'sick')} className="grid grid-cols-2 gap-3">
            <Label htmlFor="r-dayoff" className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${type === 'day_off' ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="day_off" id="r-dayoff" />
              <CalendarOff className="h-4 w-4" /> Day(s) Off
            </Label>
            <Label htmlFor="r-sick" className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${type === 'sick' ? 'border-destructive bg-destructive/5' : ''}`}>
              <RadioGroupItem value="sick" id="r-sick" />
              <Thermometer className="h-4 w-4" /> Sick Day
            </Label>
          </RadioGroup>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={type === 'sick' ? 'Any details...' : 'Reason for time off...'} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!startDate || mutation.isPending}
            variant={type === 'sick' ? 'destructive' : 'default'}>
            {type === 'sick' ? 'Report Sick' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
