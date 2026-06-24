import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, UserPlus, Users, AlertCircle, Briefcase, ShieldAlert, Trash2 } from 'lucide-react';
import { useAgentPendingAckCounts } from '@/hooks/campaign-os/usePolicyAcknowledgments';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Assignment {
  id: string;
  client_id: string;
  agent_id: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

interface Lead {
  id: string;
  name: string | null;
  company: string | null;
  pipeline_stage: string | null;
}

interface AgentProfile {
  id: string;
  full_name: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  active:     'bg-green-100 text-green-800',
  onboarding: 'bg-blue-100 text-blue-800',
};

function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full capitalize ${STAGE_COLORS[stage] ?? 'bg-muted text-muted-foreground'}`}>
      {stage}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SupervisorClientAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [notes, setNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Assignments ────────────────────────────────────────────────────────────

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['client-agent-assignments'],
    staleTime: 30_000,
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from('client_agent_assignments')
        .select('id, client_id, agent_id, is_primary, notes, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Leads (active + onboarding) — the source of truth for client data ─────

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['supervisor-leads-active'],
    staleTime: 60_000,
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, company, pipeline_stage')
        .in('pipeline_stage', ['active', 'onboarding'])
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Agents ─────────────────────────────────────────────────────────────────

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agent-users-for-assignments'],
    staleTime: 120_000,
    queryFn: async (): Promise<AgentProfile[]> => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (error) throw error;
      const userIds = (roles ?? []).map(r => r.user_id);
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .order('full_name');
      return profs ?? [];
    },
  });

  const { data: pendingAckCounts = [] } = useAgentPendingAckCounts();

  // ── Derived maps ───────────────────────────────────────────────────────────

  const leadMap  = useMemo(() => new Map(leads.map(l => [l.id, l])),  [leads]);
  const agentMap = useMemo(() => new Map(agents.map(a => [a.id, a])), [agents]);
  const pendingAckMap = useMemo(
    () => new Map(pendingAckCounts.map(c => [c.agent_user_id, c.pending_count])),
    [pendingAckCounts],
  );

  const assignedClientIds = useMemo(
    () => new Set(assignments.map(a => a.client_id)),
    [assignments],
  );

  const unassignedLeads = useMemo(
    () => leads.filter(l => !assignedClientIds.has(l.id)),
    [leads, assignedClientIds],
  );

  const agentWorkload = useMemo(
    () => agents.map(a => ({
      ...a,
      clientCount: assignments.filter(asgn => asgn.agent_id === a.id).length,
    })),
    [agents, assignments],
  );

  // ── Filtered assignments (search + agent filter) ───────────────────────────

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (agentFilter !== 'all' && a.agent_id !== agentFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const lead  = leadMap.get(a.client_id);
      const agent = agentMap.get(a.agent_id);
      return (
        lead?.name?.toLowerCase().includes(q) ||
        lead?.company?.toLowerCase().includes(q) ||
        agent?.full_name?.toLowerCase().includes(q)
      );
    });
  }, [assignments, search, agentFilter, leadMap, agentMap]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createAssignment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('client_agent_assignments').insert({
        client_id:   selectedClientId,
        agent_id:    selectedAgentId,
        assigned_by: user?.id,
        is_primary:  isPrimary,
        notes:       notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-agent-assignments'] });
      toast.success('Assignment created');
      setAssignDialog(false);
      setSelectedClientId('');
      setSelectedAgentId('');
      setNotes('');
      setIsPrimary(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_agent_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-agent-assignments'] });
      toast.success('Assignment removed');
      setConfirmDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isLoading = assignmentsLoading || leadsLoading || agentsLoading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Assignments</h1>
            <p className="text-muted-foreground">Manage which agents handle which clients</p>
          </div>
          <Button onClick={() => setAssignDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Assign Agent
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{assignments.length}</p>}
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
                  {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold text-orange-600">{unassignedLeads.length}</p>}
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
                  {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{agents.length}</p>}
                  <p className="text-sm text-muted-foreground">Available Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">
              Assignments {!isLoading && `(${assignments.length})`}
            </TabsTrigger>
            <TabsTrigger value="unassigned">
              Unassigned {!isLoading && unassignedLeads.length > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] px-1.5 py-0.5 leading-none">
                  {unassignedLeads.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="workload">Agent Workload</TabsTrigger>
          </TabsList>

          {/* ── Assignments tab ──────────────────────────────────────────── */}
          <TabsContent value="assignments" className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by client or agent…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No assignments found
                        </TableCell>
                      </TableRow>
                    ) : filtered.map(a => {
                      const lead  = leadMap.get(a.client_id);
                      const agent = agentMap.get(a.agent_id);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{lead?.name ?? 'Former client'}</TableCell>
                          <TableCell>{lead?.company ?? '—'}</TableCell>
                          <TableCell><StageBadge stage={lead?.pipeline_stage ?? null} /></TableCell>
                          <TableCell>{agent?.full_name ?? 'Unknown agent'}</TableCell>
                          <TableCell>
                            {a.is_primary
                              ? <Badge>Primary</Badge>
                              : <Badge variant="outline">Secondary</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDeleteId(a.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Unassigned tab ───────────────────────────────────────────── */}
          <TabsContent value="unassigned">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : unassignedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          All active clients are assigned
                        </TableCell>
                      </TableRow>
                    ) : unassignedLeads.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.name ?? 'Unnamed'}</TableCell>
                        <TableCell>{l.company ?? '—'}</TableCell>
                        <TableCell><StageBadge stage={l.pipeline_stage} /></TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedClientId(l.id); setAssignDialog(true); }}
                          >
                            Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Workload tab ─────────────────────────────────────────────── */}
          <TabsContent value="workload">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Assigned Clients</TableHead>
                      <TableHead>Pending Policy Acks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : agentWorkload.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No agents found</TableCell>
                      </TableRow>
                    ) : agentWorkload.map(a => {
                      const pendingAcks = pendingAckMap.get(a.id) ?? 0;
                      return (
                        <TableRow key={a.id} data-testid="agent-workload-row">
                          <TableCell className="font-medium">{a.full_name ?? 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge variant={a.clientCount > 10 ? 'destructive' : 'secondary'}>
                              {a.clientCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pendingAcks > 0 ? (
                              <Badge
                                data-testid="pending-ack-badge"
                                className="gap-1 bg-amber-500 text-white hover:bg-amber-500"
                              >
                                <ShieldAlert className="h-3 w-3" />
                                {pendingAcks}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Assign dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={assignDialog}
        onOpenChange={open => {
          setAssignDialog(open);
          if (!open) { setSelectedClientId(''); setSelectedAgentId(''); setNotes(''); setIsPrimary(true); }
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Agent to Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name ?? 'Unnamed'}{l.company ? ` — ${l.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Agent</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent…" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-primary"
                checked={isPrimary}
                onCheckedChange={val => setIsPrimary(!!val)}
              />
              <label htmlFor="is-primary" className="text-sm">Primary agent for this client</label>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. covering while primary is on leave"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createAssignment.mutate()}
              disabled={!selectedClientId || !selectedAgentId || createAssignment.isPending}
            >
              {createAssignment.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              The agent will no longer see this client. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && deleteAssignment.mutate(confirmDeleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </StaffLayout>
  );
}
