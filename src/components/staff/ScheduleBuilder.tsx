import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format, getDay, isAfter, isBefore, isEqual, parseISO } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface ScheduleBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateDates(startDate: string, endDate: string, type: string, interval: number): string[] {
  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (type === 'weekdays') {
    let d = start;
    while (!isAfter(d, end)) {
      const day = getDay(d);
      if (day >= 1 && day <= 5) dates.push(format(d, 'yyyy-MM-dd'));
      d = addDays(d, 1);
    }
  } else if (type === 'weekends') {
    let d = start;
    while (!isAfter(d, end)) {
      const day = getDay(d);
      if (day === 0 || day === 6) dates.push(format(d, 'yyyy-MM-dd'));
      d = addDays(d, 1);
    }
  } else if (type === 'custom') {
    let d = start;
    while (!isAfter(d, end)) {
      dates.push(format(d, 'yyyy-MM-dd'));
      d = addDays(d, interval);
    }
  }
  return dates;
}

export function ScheduleBuilder({ open, onOpenChange }: ScheduleBuilderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [agentId, setAgentId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekdays');
  const [recurrenceDays, setRecurrenceDays] = useState(2);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const { data: agents = [] } = useQuery({
    queryKey: ['schedule-agents'],
    queryFn: async () => {
      const { data: roleData } = await supabase.from('user_roles').select('user_id').eq('role', 'agent');
      if (!roleData?.length) return [];
      const ids = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      return profiles || [];
    },
  });

  const shiftDates = useMemo(() => {
    if (!repeat || !shiftDate || !recurrenceEndDate) return [shiftDate].filter(Boolean);
    return generateDates(shiftDate, recurrenceEndDate, recurrenceType, recurrenceDays);
  }, [repeat, shiftDate, recurrenceEndDate, recurrenceType, recurrenceDays]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const parentId = repeat ? crypto.randomUUID() : null;
      const rows = (repeat ? shiftDates : [shiftDate]).map(d => ({
        agent_id: agentId,
        created_by: user!.id,
        shift_date: d,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        recurrence_type: repeat ? recurrenceType : null,
        recurrence_days: repeat && recurrenceType === 'custom' ? recurrenceDays : null,
        recurrence_end_date: repeat ? recurrenceEndDate : null,
        parent_schedule_id: parentId,
      }));
      const { error } = await supabase.from('agent_schedules').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-schedules'] });
      toast({ title: 'Schedule created', description: `${repeat ? shiftDates.length + ' shifts' : '1 shift'} assigned.` });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create schedule.', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setAgentId(''); setShiftDate(''); setStartTime('09:00'); setEndTime('17:00');
    setNotes(''); setRepeat(false); setRecurrenceType('weekdays');
    setRecurrenceDays(2); setRecurrenceEndDate('');
  };

  const isValid = agentId && shiftDate && startTime && endTime && startTime !== endTime && (!repeat || recurrenceEndDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Create Schedule Entry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name || a.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{repeat ? 'Start Date' : 'Date'}</Label>
            <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Repeat section */}
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="repeat-toggle" className="cursor-pointer">Repeat this shift</Label>
            </div>
            <Switch id="repeat-toggle" checked={repeat} onCheckedChange={setRepeat} />
          </div>

          {repeat && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Pattern</Label>
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                    <SelectItem value="weekends">Weekends (Sat–Sun)</SelectItem>
                    <SelectItem value="custom">Every X Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrenceType === 'custom' && (
                <div className="space-y-2">
                  <Label>Every how many days?</Label>
                  <Input type="number" min={1} max={30} value={recurrenceDays} onChange={(e) => setRecurrenceDays(parseInt(e.target.value) || 1)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Until (end date)</Label>
                <Input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} min={shiftDate} />
              </div>
              {shiftDates.length > 0 && (
                <p className="text-sm text-muted-foreground">This will create <span className="font-semibold text-foreground">{shiftDates.length}</span> shift(s)</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!isValid || createMutation.isPending}>
            {repeat ? `Create ${shiftDates.length} Shifts` : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
