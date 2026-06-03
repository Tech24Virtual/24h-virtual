import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: { agentId: string; scheduleId?: string; date: string; startTime: string; endTime: string };
}

export function PostOpenShiftDialog({ open, onOpenChange, prefill }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(prefill?.date || '');
  const [startTime, setStartTime] = useState(prefill?.startTime || '09:00');
  const [endTime, setEndTime] = useState(prefill?.endTime || '17:00');
  const [notes, setNotes] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-skill-names'],
    queryFn: async () => {
      const { data } = await supabase.from('agent_skills').select('skill_name');
      return [...new Set((data || []).map(s => s.skill_name))].sort();
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('open_shifts').insert({
        original_agent_id: prefill?.agentId || user!.id,
        original_schedule_id: prefill?.scheduleId || null,
        shift_date: date,
        start_time: startTime,
        end_time: endTime,
        required_skills: selectedSkills,
        notes: notes || null,
        posted_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] });
      toast({ title: 'Shift posted', description: 'Eligible agents will be notified.' });
      onOpenChange(false);
    },
    onError: () => toast({ title: 'Error', description: 'Failed to post shift.', variant: 'destructive' }),
  });

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) setSelectedSkills(prev => [...prev, trimmed]);
    setSkillInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Post Open Shift</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Start</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-2"><Label>End</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Required Skills</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedSkills.map(s => (
                <Badge key={s} variant="secondary" className="flex items-center gap-1 pr-1">
                  {s}
                  <button onClick={() => setSelectedSkills(prev => prev.filter(x => x !== s))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add required skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                list="shift-skill-suggestions"
              />
              <datalist id="shift-skill-suggestions">
                {allSkills.filter(s => !selectedSkills.includes(s)).map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!date || !startTime || !endTime || mutation.isPending}>Post Shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
