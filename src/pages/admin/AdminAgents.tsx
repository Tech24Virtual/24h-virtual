import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Headphones,
  Save,
  Tags,
  UserMinus,
  UserPlus,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { AgentSkillsManager } from '@/components/staff/AgentSkillsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

// ── Types ─────────────────────────────────────────────────────────────────

interface AgentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  employment_status: string | null;
  hourly_rate: number | null;
  employment_type: string;
  break_policy: string;
  skill_count: number;
}

// ── Invite Dialog ─────────────────────────────────────────────────────────

interface InviteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InviteAgentDialog({ open, onOpenChange }: InviteAgentDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  function setField(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleClose(next: boolean) {
    if (busy) return;
    if (!next) setForm({ name: '', email: '', password: '' });
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          roles: ['agent'],
        },
      });
      if (error) throw error;
      toast({ title: 'Agent invited', description: `${form.name} can now log in to the agent portal.` });
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      handleClose(false);
    } catch (err: any) {
      toast({ title: 'Invite failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const isValid =
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    form.password.length >= 8;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Agent
          </DialogTitle>
          <DialogDescription>
            Creates a new agent account. The agent can log in immediately with these credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ia-name">Full Name *</Label>
            <Input
              id="ia-name"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Jane Smith"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ia-email">Email *</Label>
            <Input
              id="ia-email"
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="agent@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ia-password">Temporary Password *</Label>
            <Input
              id="ia-password"
              type="password"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Agent should change this on first login.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !isValid}>
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inviting…
                </>
              ) : (
                'Send Invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'active':
    case null:
      return <Badge variant="secondary" className="bg-cta/10 text-cta">Active</Badge>;
    case 'inactive':
      return <Badge variant="outline">Inactive</Badge>;
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>;
    case 'on_leave':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">On Leave</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status.replace(/_/g, ' ')}</Badge>;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminAgents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [edits, setEdits] = useState<Record<string, Partial<AgentRow>>>({});
  const [skillsAgent, setSkillsAgent] = useState<{ id: string; name: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<AgentRow | null>(null);
  const [offboardingId, setOffboardingId] = useState<string | null>(null);

  const { data: agents = [], isLoading, error } = useQuery({
    queryKey: ['admin-agents'],
    staleTime: 60_000,
    queryFn: async () => {
      // 1. Get all agent user IDs
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const ids = roleData.map(r => r.user_id);

      // 2. Fetch profiles, banking, skills in parallel
      // profiles.email is a column added via migration; cast needed since types.ts predates it
      const [profilesResult, bankingResult, skillsResult] = await Promise.all([
        (supabase as any)
          .from('profiles')
          .select('id, full_name, phone, employment_status, email')
          .in('id', ids),
        supabase
          .from('agent_banking')
          .select('agent_id, hourly_rate, employment_type, break_policy')
          .in('agent_id', ids),
        supabase
          .from('agent_skills')
          .select('agent_id')
          .in('agent_id', ids),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      // banking / skills errors are non-fatal — list still renders

      const profiles: Array<{
        id: string;
        full_name: string | null;
        phone: string | null;
        employment_status: string | null;
        email: string | null;
      }> = profilesResult.data || [];
      const banking = (bankingResult.data || []) as Array<{
        agent_id: string;
        hourly_rate: number | null;
        employment_type: string;
        break_policy: string;
      }>;
      const skills = (skillsResult.data || []) as Array<{ agent_id: string }>;

      const skillCounts: Record<string, number> = {};
      skills.forEach(s => { skillCounts[s.agent_id] = (skillCounts[s.agent_id] || 0) + 1; });

      return profiles.map(p => {
        const b = banking.find(bk => bk.agent_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          employment_status: p.employment_status,
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
      const base = agents.find(a => a.id === agentId);
      const { error } = await supabase
        .from('agent_banking')
        .upsert(
          {
            agent_id: agentId,
            hourly_rate: changes.hourly_rate ?? base?.hourly_rate ?? null,
            employment_type: changes.employment_type ?? base?.employment_type ?? 'contractor',
            break_policy: changes.break_policy ?? base?.break_policy ?? 'global',
          },
          { onConflict: 'agent_id' }
        );
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

  async function handleOffboard(agent: AgentRow) {
    setOffboardTarget(null);
    setOffboardingId(agent.id);
    try {
      const { data, error } = await supabase.functions.invoke('run-lifecycle-agent', {
        body: { action: 'offboard', agent_id: agent.id, initiated_by: user?.id || 'manual' },
      });
      if (error) throw error;
      toast({ title: 'Offboarding', description: data?.summary || 'Agent offboarding processed.' });
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
    } catch (err: any) {
      toast({ title: 'Offboarding failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setOffboardingId(null);
    }
  }

  const getVal = (agent: AgentRow, field: keyof AgentRow) =>
    edits[agent.id]?.[field] ?? agent[field];

  const setVal = (agentId: string, field: string, value: unknown) =>
    setEdits(prev => ({ ...prev, [agentId]: { ...prev[agentId], [field]: value } }));

  const filteredAgents = agents.filter(agent => {
    const q = searchQuery.toLowerCase();
    return (
      agent.full_name?.toLowerCase().includes(q) ||
      agent.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Agent Management</h1>
            <p className="text-muted-foreground mt-1">Manage your virtual receptionist agents</p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Agent
          </Button>
        </div>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              All Agents {!isLoading && !error && `(${agents.length})`}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error state */}
          {error ? (
            <div className="text-center py-12 text-destructive/80">
              <AlertTriangle className="w-10 w-10 mx-auto mb-3 opacity-60" />
              <p className="font-medium">Failed to load agents</p>
              <p className="text-xs text-muted-foreground mt-1">
                Verify <code className="font-mono">GRANT SELECT ON public.user_roles</code> and{' '}
                <code className="font-mono">public.profiles</code> are applied.
              </p>
            </div>
          ) : isLoading ? (
            /* Skeleton rows */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Break Policy</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Headphones className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">
                {searchQuery ? 'No agents match your search' : 'No agents yet'}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-2" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite your first agent
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Break Policy</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {agent.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agent.email || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {agent.phone || '-'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-24"
                          value={(getVal(agent, 'hourly_rate') as number | null) ?? ''}
                          onChange={e =>
                            setVal(agent.id, 'hourly_rate', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={getVal(agent, 'employment_type') as string}
                          onValueChange={v => setVal(agent.id, 'employment_type', v)}
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
                          onValueChange={v => setVal(agent.id, 'break_policy', v)}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSkillsAgent({ id: agent.id, name: agent.full_name || 'Agent' })}
                        >
                          <Tags className="h-3.5 w-3.5 mr-1" />
                          {agent.skill_count}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={agent.employment_status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {edits[agent.id] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Save changes"
                              onClick={() => saveMutation.mutate(agent.id)}
                              disabled={saveMutation.isPending}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Offboard agent"
                            disabled={offboardingId === agent.id}
                            onClick={() => setOffboardTarget(agent)}
                          >
                            {offboardingId === agent.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserMinus className="w-4 h-4" />
                            )}
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

      {/* Skills dialog */}
      {skillsAgent && (
        <AgentSkillsManager
          agentId={skillsAgent.id}
          agentName={skillsAgent.name}
          open={!!skillsAgent}
          onOpenChange={open => { if (!open) setSkillsAgent(null); }}
        />
      )}

      {/* Invite dialog */}
      <InviteAgentDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Offboard confirmation */}
      <AlertDialog
        open={!!offboardTarget}
        onOpenChange={open => { if (!open) setOffboardTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offboard {offboardTarget?.full_name ?? 'this agent'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will run the lifecycle offboarding workflow — revoking access, archiving records,
              and notifying relevant parties. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => offboardTarget && handleOffboard(offboardTarget)}
            >
              Offboard Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
