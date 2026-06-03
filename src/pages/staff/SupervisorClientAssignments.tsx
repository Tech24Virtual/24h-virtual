import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Search, UserPlus, Users, AlertCircle, Briefcase } from 'lucide-react';

export default function SupervisorClientAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [notes, setNotes] = useState('');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['client-agent-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_agent_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles-for-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agent-users-for-assignments'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'agent');
      if (error) throw error;
      const userIds = roles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      return profs || [];
    },
  });

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const agentMap = new Map(agents.map(a => [a.id, a]));

  // Clients that have no assignment
  const assignedClientIds = new Set(assignments.map(a => a.client_id));
  const unassignedClients = profiles.filter(p => !assignedClientIds.has(p.id));

  // Agent workload
  const agentWorkload = agents.map(a => ({
    ...a,
    clientCount: assignments.filter(asgn => asgn.agent_id === a.id).length,
  }));

  const createAssignment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('client_agent_assignments').insert({
        client_id: selectedClientId,
        agent_id: selectedAgentId,
        assigned_by: user?.id,
        is_primary: isPrimary,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-agent-assignments'] });
      toast({ title: 'Assignment created' });
      setAssignDialog(false);
      setSelectedClientId('');
      setSelectedAgentId('');
      setNotes('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_agent_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-agent-assignments'] });
      toast({ title: 'Assignment removed' });
    },
  });

  const filtered = assignments.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    const client = profileMap.get(a.client_id);
    const agent = agentMap.get(a.agent_id);
    return (
      client?.full_name?.toLowerCase().includes(q) ||
      client?.company_name?.toLowerCase().includes(q) ||
      agent?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Assignments</h1>
            <p className="text-muted-foreground">Manage which agents handle which clients</p>
          </div>
          <Button onClick={() => setAssignDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Assign Agent
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{assignments.length}</p>
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{unassignedClients.length}</p>
                  <p className="text-sm text-muted-foreground">Unassigned Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{agents.length}</p>
                  <p className="text-sm text-muted-foreground">Available Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned Clients</TabsTrigger>
            <TabsTrigger value="workload">Agent Workload</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search assignments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    )) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments found</TableCell></TableRow>
                    ) : filtered.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{profileMap.get(a.client_id)?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{profileMap.get(a.client_id)?.company_name || '—'}</TableCell>
                        <TableCell>{agentMap.get(a.agent_id)?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{a.is_primary ? <Badge>Primary</Badge> : <Badge variant="outline">Secondary</Badge>}</TableCell>
                        <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => deleteAssignment.mutate(a.id)}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unassigned">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedClients.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">All clients are assigned</TableCell></TableRow>
                    ) : unassignedClients.slice(0, 50).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name || 'Unknown'}</TableCell>
                        <TableCell>{c.company_name || '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedClientId(c.id); setAssignDialog(true); }}>Assign</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workload">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Assigned Clients</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentWorkload.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.full_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={a.clientCount > 10 ? 'destructive' : 'secondary'}>{a.clientCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Agent to Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.company_name || p.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Agent</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name || a.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button onClick={() => createAssignment.mutate()} disabled={!selectedClientId || !selectedAgentId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
