import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface Props {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentSkillsManager({ agentId, agentName, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [newSkill, setNewSkill] = useState('');

  const { data: skills = [] } = useQuery({
    queryKey: ['agent-skills', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_skills')
        .select('*')
        .eq('agent_id', agentId)
        .order('skill_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-skill-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_skills')
        .select('skill_name');
      if (error) throw error;
      const unique = [...new Set((data || []).map(s => s.skill_name))];
      return unique.sort();
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('agent_skills').insert({ agent_id: agentId, skill_name: name.trim() } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-skills', agentId] });
      queryClient.invalidateQueries({ queryKey: ['all-skill-names'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setNewSkill('');
    },
    onError: () => toast({ title: 'Error', description: 'Failed to add skill.', variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_skills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-skills', agentId] });
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to remove skill.', variant: 'destructive' }),
  });

  const suggestions = allSkills.filter(
    s => s.toLowerCase().includes(newSkill.toLowerCase()) && !skills.some(sk => sk.skill_name === s)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skills — {agentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills assigned</p>}
            {skills.map(s => (
              <Badge key={s.id} variant="secondary" className="flex items-center gap-1 pr-1">
                {s.skill_name}
                <button onClick={() => removeMutation.mutate(s.id)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add skill..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newSkill.trim()) addMutation.mutate(newSkill); }}
              list="skill-suggestions"
            />
            <datalist id="skill-suggestions">
              {suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
            <Button size="icon" onClick={() => { if (newSkill.trim()) addMutation.mutate(newSkill); }} disabled={!newSkill.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
