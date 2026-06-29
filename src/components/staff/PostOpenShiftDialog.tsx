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
import { Switch } from '@/components/ui/switch';
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
  const [splitIntoBlocks, setSplitIntoBlocks] = useState(false);
  const [block1End, setBlock1End] = useState('');

  const calcMidpoint = (start: string, end: string): string => {
    const s = new Date(`2000-01-01T${start}`);
    const e = new Date(`2000-01-01T${end}`);
    const mid = new Date((s.getTime() + e.getTime()) / 2);
    return `${String(mid.getHours()).padStart(2, '0')}:${String(mid.getMinutes()).padStart(2, '0')}`;
  };

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
      if (splitIntoBlocks && block1End) {
        // Insert block 1 (parent)
        const { data: parent, error: parentErr } = await supabase
          .from('open_shifts')
          .insert({
            original_agent_id: prefill?.agentId || user!.id,
            original_schedule_id: prefill?.scheduleId || null,
            shift_date: date,
            start_time: startTime,
            end_time: block1End,
            required_skills: selectedSkills,
            notes: notes || null,
            posted_by: user!.id,
            total_blocks: 2,
          } as any)
          .select('id')
          .single();
        if (parentErr) throw parentErr;

        // Insert block 2 (child)
        const { error: childErr } = await supabase
          .from('open_shifts')
          .insert({
            original_agent_id: prefill?.agentId || user!.id,
            original_schedule_id: prefill?.scheduleId || null,
            shift_date: date,
            start_time: block1End,
            end_time: endTime,
            required_skills: selectedSkills,
            notes: notes || null,
            posted_by: user!.id,
            parent_shift_id: parent!.id,
            total_blocks: 2,
          } as any);
        if (childErr) throw childErr;
      } else {
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
      }

      // Notify all agents so they can claim the shift
      const { data: agentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (agentRoles?.length) {
        await (supabase as any).from('notifications').insert(
          agentRoles.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            title: 'New Open Shift Available',
            message: `A shift on ${date} from ${startTime} to ${endTime} is available to claim. Check the Open Shifts board.`,
            category: 'scheduling',
            action_url: '/staff/agent/schedule',
          })),
        );
      }
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
          {/* Split shift toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="text-sm font-medium">Split into 2 blocks</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Agents can claim individual blocks</p>
            </div>
            <Switch
              checked={splitIntoBlocks}
              onCheckedChange={(checked) => {
                setSplitIntoBlocks(checked);
                if (checked && startTime && endTime) {
                  setBlock1End(calcMidpoint(startTime, endTime));
                }
              }}
            />
          </div>

          {splitIntoBlocks && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Block Times</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Block 1 ends at</Label>
                  <Input
                    type="time"
                    value={block1End}
                    onChange={(e) => setBlock1End(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{startTime} – {block1End || '?'}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Block 2 (auto)</Label>
                  <Input type="time" value={block1End} disabled className="bg-muted/20" />
                  <p className="text-xs text-muted-foreground">{block1End || '?'} – {endTime}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!date || !startTime || !endTime || (splitIntoBlocks && !block1End) || mutation.isPending}
          >
            {splitIntoBlocks ? 'Post 2 Blocks' : 'Post Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
