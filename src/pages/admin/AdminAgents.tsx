import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Headphones, Plus, Save, Tags, UserMinus } from 'lucide-react';
import { AgentSkillsManager } from '@/components/staff/AgentSkillsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AgentRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  hourly_rate: number | null;
  employment_type: string;
  break_policy: string;
  skill_count: number;
}

export default function AdminAgents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [edits, setEdits] = useState<Record<string, Partial<AgentRow>>>({});
  const [skillsAgent, setSkillsAgent] = useState<{ id: string; name: string } | null>(null);
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (!roleData?.length) return [];
      const ids = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', ids);
      const { data: banking } = await supabase
        .from('agent_banking')
        .select('agent_id, hourly_rate, employment_type, break_policy')
        .in('agent_id', ids);
      const { data: skills } = await supabase
        .from('agent_skills')
        .select('agent_id')
        .in('agent_id', ids);
      const skillCounts: Record<string, number> = {};
      (skills || []).forEach(s => { skillCounts[s.agent_id] = (skillCounts[s.agent_id] || 0) + 1; });
      return (profiles || []).map(p => {
        const b = banking?.find(bk => bk.agent_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          phone: p.phone,
          hourly_rate: b?.hourly_rate ?? null,
          employment_type: b?.employment_type ?? 'contractor',
          break_policy: b?.break_policy ?? 'global',
          skill_count: skillCounts[p.id] || 0,
        } as AgentRow;
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const changes = edits[agentId];
      if (!changes) return;
      const { error } = await supabase
        .from('agent_banking')
        .upsert({
          agent_id: agentId,
          hourly_rate: changes.hourly_rate ?? agents.find(a => a.id === agentId)?.hourly_rate ?? null,
          employment_type: changes.employment_type ?? agents.find(a => a.id === agentId)?.employment_type ?? 'contractor',
          break_policy: changes.break_policy ?? agents.find(a => a.id === agentId)?.break_policy ?? 'global',
        }, { onConflict: 'agent_id' });
      if (error) throw error;
    },
    onSuccess: (_, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setEdits(prev => { const n = { ...prev }; delete n[agentId]; return n; });
      toast({ title: 'Saved', description: 'Agent settings updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    },
  });

  const getVal = (agent: AgentRow, field: keyof AgentRow) => {
    return edits[agent.id]?.[field] ?? agent[field];
  };

  const setVal = (agentId: string, field: string, value: unknown) => {
    setEdits(prev => ({ ...prev, [agentId]: { ...prev[agentId], [field]: value } }));
  };

  const filteredAgents = agents.filter(agent =>
    agent.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Agent Management</h1>
          <p className="text-muted-foreground mt-1">Manage your virtual receptionist agents</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Agents ({agents.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Headphones className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No agents found</p>
              <p className="text-sm">Add agents to start handling calls</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Employment Type</TableHead>
                     <TableHead>Break Policy</TableHead>
                     <TableHead>Skills</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        {agent.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{agent.phone || '-'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-24"
                          value={getVal(agent, 'hourly_rate') ?? ''}
                          onChange={(e) => setVal(agent.id, 'hourly_rate', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={getVal(agent, 'employment_type') as string}
                          onValueChange={(v) => setVal(agent.id, 'employment_type', v)}
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={getVal(agent, 'break_policy') as string}
                          onValueChange={(v) => setVal(agent.id, 'break_policy', v)}
                        >
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">Global Default</SelectItem>
                            <SelectItem value="paid">Always Paid</SelectItem>
                            <SelectItem value="unpaid">Always Unpaid</SelectItem>
                          </SelectContent>
                        </Select>
                       </TableCell>
                       <TableCell>
                         <Button variant="ghost" size="sm" onClick={() => setSkillsAgent({ id: agent.id, name: agent.full_name || 'Agent' })}>
                           <Tags className="h-3.5 w-3.5 mr-1" /> {agent.skill_count}
                         </Button>
                       </TableCell>
                       <TableCell>
                         <Badge variant="secondary" className="bg-cta/10 text-cta">
                           Active
                         </Badge>
                       </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {edits[agent.id] && (
                            <Button variant="ghost" size="icon" onClick={() => saveMutation.mutate(agent.id)} disabled={saveMutation.isPending}>
                              <Save className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Offboard agent"
                            onClick={async () => {
                              const { data, error } = await supabase.functions.invoke('run-lifecycle-agent', {
                                body: { action: 'offboard', agent_id: agent.id, initiated_by: user?.id || 'manual' },
                              });
                              if (error) {
                                toast({ title: 'Offboarding failed', description: String(error), variant: 'destructive' });
                              } else {
                                toast({ title: 'Offboarding', description: data?.summary || 'Agent offboarding processed.' });
                              }
                            }}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {skillsAgent && (
        <AgentSkillsManager
          agentId={skillsAgent.id}
          agentName={skillsAgent.name}
          open={!!skillsAgent}
          onOpenChange={(open) => { if (!open) setSkillsAgent(null); }}
        />
      )}
    </div>
  );
}
