/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertTriangle, Plus, CheckCircle, Search } from 'lucide-react';

const priorityColors: Record<string, string> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  urgent: 'destructive',
};

const statusColors: Record<string, string> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
};

type EscalationForm = {
  target_department: string;
  subject: string;
  description: string;
  priority: string;
  related_agent_id: string;
  related_client_id: string;
};

type Escalation = {
  id: string;
  supervisor_id: string;
  target_department: string;
  subject: string;
  description: string | null;
  priority: string | null;
  related_agent_id: string | null;
  related_client_id: string | null;
  status: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  related_agent: { full_name: string | null } | null;
  related_client: { name: string | null; company: string | null } | null;
};

function EscalationDetailSheet({
  escalation,
  onOpenChange,
  onResolve,
}: {
  escalation: Escalation | null;
  onOpenChange: (open: boolean) => void;
  onResolve: (id: string) => void;
}) {
  return (
    <Sheet open={!!escalation} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {escalation && (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl pr-6">{escalation.subject}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={(statusColors[escalation.status ?? ''] ?? 'secondary') as any}
                  className="capitalize"
                >
                  {escalation.status?.replace('_', ' ')}
                </Badge>
                <Badge
                  variant={(priorityColors[escalation.priority ?? ''] ?? 'secondary') as any}
                  className="capitalize"
                >
                  {escalation.priority} priority
                </Badge>
                <Badge variant="outline" className="capitalize">{escalation.target_department}</Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="text-sm mt-0.5">
                  {format(new Date(escalation.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">
                  {escalation.description || 'No description provided.'}
                </p>
              </div>

              {escalation.related_agent_id && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Related Agent</p>
                  <p className="text-sm mt-0.5">
                    {escalation.related_agent?.full_name || 'Unknown agent'}
                  </p>
                </div>
              )}

              {escalation.related_client_id && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Related Client</p>
                  <p className="text-sm mt-0.5">
                    {escalation.related_client?.name || 'Unknown client'}
                    {escalation.related_client?.company && ` · ${escalation.related_client.company}`}
                  </p>
                </div>
              )}

              {escalation.status === 'resolved' && (
                <div className="pt-3 border-t space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Resolution Notes</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">
                      {escalation.resolution_notes || '—'}
                    </p>
                  </div>
                  {escalation.resolved_at && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Resolved At</p>
                      <p className="text-sm mt-0.5">
                        {format(new Date(escalation.resolved_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {escalation.status !== 'resolved' && (
              <SheetFooter className="mt-6">
                <Button onClick={() => onResolve(escalation.id)} className="w-full sm:w-auto">
                  Resolve
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function SupervisorEscalations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [form, setForm] = useState<EscalationForm>({
    target_department: '', subject: '', description: '', priority: 'medium',
    related_agent_id: '', related_client_id: '',
  });

  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ['supervisor-escalations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('supervisor_escalations')
        .select(`
          *,
          related_agent:profiles!related_agent_id(full_name),
          related_client:leads!related_client_id(name, company)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Escalation[];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['escalation-agents'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'agent');
      const ids = (roles ?? []).map(r => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      return data ?? [];
    },
  });

  const { data: activeClients = [] } = useQuery({
    queryKey: ['escalation-active-clients'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('leads')
        .select('id, name, company')
        .eq('pipeline_stage', 'active')
        .order('name');
      return data ?? [];
    },
  });

  const createEscalation = useMutation({
    // Pass form snapshot as variables so onSuccess gets the exact values used in the insert
    mutationFn: async (formData: EscalationForm) => {
      const { error } = await (supabase as any).from('supervisor_escalations').insert({
        supervisor_id: user!.id,
        target_department: formData.target_department,
        subject: formData.subject,
        description: formData.description || null,
        priority: formData.priority,
        related_agent_id: formData.related_agent_id || null,
        related_client_id: formData.related_client_id || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, formData) => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-escalations'] });
      toast.success('Escalation created');
      setCreateDialog(false);
      setForm({
        target_department: '', subject: '', description: '', priority: 'medium',
        related_agent_id: '', related_client_id: '',
      });

      // Fire-and-forget: notify all users in the target department
      supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', formData.target_department)
        .then(({ data: deptUsers }) => {
          if (!deptUsers?.length) return;
          return supabase.from('notifications').insert(
            deptUsers.map(u => ({
              user_id: u.user_id,
              title: 'New Escalation',
              message: `A ${formData.priority} priority escalation has been assigned to your department: ${formData.subject}`,
              category: 'escalation',
              action_url: '/staff/supervisor/escalations',
            }))
          );
        })
        .catch(() => {});
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create escalation'),
  });

  const resolveEscalation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supervisor_escalations').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-escalations'] });
      toast.success('Escalation resolved');

      // Fire-and-forget: notify the original escalation creator
      const esc = escalations.find(e => e.id === id);
      if (esc?.supervisor_id) {
        supabase.from('notifications').insert({
          user_id: esc.supervisor_id,
          title: 'Escalation Resolved',
          message: `The escalation "${esc.subject}" has been resolved.`,
          category: 'escalation',
          action_url: '/staff/supervisor/escalations',
        }).catch(() => {});
      }

      setResolveDialog(null);
      setResolutionNotes('');
      setSelectedEscalation(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to resolve escalation'),
  });

  const filtered = escalations.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.subject.toLowerCase().includes(q) || e.target_department.toLowerCase().includes(q);
  });

  // Include in_progress in "open" count — both statuses need supervisor attention
  const openCount = escalations.filter(e => e.status === 'open' || e.status === 'in_progress').length;
  const resolvedCount = escalations.filter(e => e.status === 'resolved').length;

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        {/* Header — matches all other redesigned supervisor pages */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Escalations</h1>
                <p className="text-muted-foreground mt-0.5">Manage and resolve department escalations</p>
              </div>
            </div>
            <Button onClick={() => setCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Escalation
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-xs text-muted-foreground">Open / In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{escalations.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedCount}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search escalations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No escalations</p>
                      <p className="text-sm mt-0.5">Use the button above to create one.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(e => (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEscalation(e)}
                    >
                      <TableCell className="font-medium">{e.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {e.description ? e.description.substring(0, 80) + (e.description.length > 80 ? '...' : '') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{e.target_department}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(priorityColors[e.priority ?? ''] ?? 'secondary') as any}
                          className="capitalize"
                        >
                          {e.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(statusColors[e.status ?? ''] ?? 'secondary') as any}
                          className="capitalize"
                        >
                          {e.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(e.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell>
                        {e.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(ev) => { ev.stopPropagation(); setResolveDialog(e.id); }}
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail sheet */}
      <EscalationDetailSheet
        escalation={selectedEscalation}
        onOpenChange={(open) => { if (!open) setSelectedEscalation(null); }}
        onResolve={(id) => setResolveDialog(id)}
      />

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Escalation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Target Department</label>
              <Select
                value={form.target_department}
                onValueChange={v => setForm(f => ({ ...f, target_department: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={form.priority}
                onValueChange={v => setForm(f => ({ ...f, priority: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Related Agent (optional)</label>
              <Select
                value={form.related_agent_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, related_agent_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name || a.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Related Client (optional)</label>
              <Select
                value={form.related_client_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, related_client_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeClients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.company ? ` (${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createEscalation.mutate(form)}
              disabled={!form.target_department || !form.subject || createEscalation.isPending}
            >
              {createEscalation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Escalation</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium">Resolution Notes</label>
            <Textarea
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              placeholder="How was this resolved?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button
              onClick={() => resolveDialog && resolveEscalation.mutate(resolveDialog)}
              disabled={resolveEscalation.isPending}
            >
              {resolveEscalation.isPending ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
