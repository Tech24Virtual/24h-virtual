import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, GraduationCap, RefreshCw, UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { useCampaignCompletions, useDeleteCompletion, type TrainingCompletion } from '@/hooks/campaign-os/useTrainingCompletions';
import { useSignoffs, useCreateSignoff } from '@/hooks/campaign-os/useTrainingSignoffs';
import { useAssignTraining, usePublishedModulesForAssign, useAgentsForAssign } from '@/hooks/campaign-os/useTrainingAssignments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

// ── Inline queries ─────────────────────────────────────────────────────────────

interface SignoffWithExpiry {
  id: string;
  completion_id: string;
  module_id: string;
  campaign_id: string;
  agent_id: string;
  signed_off_at: string;
  expires_at: string | null;
  needs_refresh: boolean;
  refresh_reason: string | null;
}

function useSignoffsWithExpiry() {
  return useQuery({
    queryKey: ['campaign-os', 'agent-training-signoffs-needs-refresh'],
    queryFn: async (): Promise<SignoffWithExpiry[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_signoffs')
        .select('id, completion_id, module_id, campaign_id, agent_id, signed_off_at, expires_at, needs_refresh, refresh_reason')
        .order('signed_off_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SignoffWithExpiry[];
    },
  });
}

function useAllPublishedModules() {
  return useQuery({
    queryKey: ['campaign-os', 'all-published-modules-active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_modules')
        .select('id, title, campaign_id, required')
        .eq('status', 'published');
      if (error) throw error;
      return data as Array<{ id: string; title: string; campaign_id: string; required: boolean }>;
    },
  });
}

function useAgentNames(agentIds: string[]) {
  return useQuery({
    queryKey: ['profiles', 'training-agents', agentIds.sort().join(',')],
    enabled: agentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const p of data ?? []) map.set(p.id, p.full_name ?? p.id);
      return map;
    },
  });
}

/** Agent's current refresher cadence — used to tell a supervisor when a fresh signoff will next come due. */
function useAgentRefresherIntervals(agentIds: string[]) {
  return useQuery({
    queryKey: ['profiles', 'training-agent-refresher-intervals', agentIds.sort().join(',')],
    enabled: agentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, refresher_interval_months')
        .in('id', agentIds);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const p of data ?? []) map.set(p.id, p.refresher_interval_months ?? 1);
      return map;
    },
  });
}

// ── Assign Training dialog ─────────────────────────────────────────────────────

function AssignTrainingDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const modulesQ = usePublishedModulesForAssign();
  const agentsQ = useAgentsForAssign();
  const assign = useAssignTraining();

  const [moduleId, setModuleId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleAssign = async () => {
    if (!moduleId || !agentId) return;
    try {
      await assign.mutateAsync({
        module_id: moduleId,
        agent_id: agentId,
        due_date: dueDate || null,
      });
      toast.success('Training assigned');
      setModuleId('');
      setAgentId('');
      setDueDate('');
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Training</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent…" />
              </SelectTrigger>
              <SelectContent>
                {(agentsQ.data ?? []).map(a => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.profiles?.full_name ?? a.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select module…" />
              </SelectTrigger>
              <SelectContent>
                {(modulesQ.data ?? []).map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                    {m.campaign && (
                      <span className="text-muted-foreground ml-1">— {m.campaign.display_name}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!moduleId || !agentId || assign.isPending}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review dialog ──────────────────────────────────────────────────────────────

function ReviewDialog({
  completion,
  moduleName,
  agentName,
  onApprove,
  onReject,
  onClose,
  approving,
  rejecting,
}: {
  completion: TrainingCompletion | null;
  moduleName: string;
  agentName: string;
  onApprove: (note: string) => void;
  onReject: () => void;
  onClose: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const [note, setNote] = useState('');
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  if (!completion) return null;

  return (
    <>
      <Dialog open onOpenChange={o => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review completion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div><strong>Module:</strong> {moduleName}</div>
            <div><strong>Agent:</strong> {agentName}</div>
            <div><strong>Completed:</strong> {new Date(completion.completed_at).toLocaleString()}</div>
            {completion.agent_notes && (
              <div>
                <strong>Agent notes:</strong>
                <div className="italic text-muted-foreground mt-1">"{completion.agent_notes}"</div>
              </div>
            )}
            <div>
              <label className="font-medium">Signoff note (optional)</label>
              <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectConfirmOpen(true)} disabled={rejecting}>
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button onClick={() => onApprove(note)} disabled={approving}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject completion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the completion. The agent will need to review the material and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onReject}>Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SupervisorTrainingSignoffs() {
  const completionsQ = useCampaignCompletions();
  const signoffsQ = useSignoffs();
  const signoffsWithExpiryQ = useSignoffsWithExpiry();
  const modulesQ = useAllPublishedModules();
  const createSignoff = useCreateSignoff();
  const deleteCompletion = useDeleteCompletion();

  const [active, setActive] = useState<TrainingCompletion | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const signedIds = useMemo(
    () => new Set((signoffsQ.data ?? []).map(s => s.completion_id)),
    [signoffsQ.data],
  );

  const pending = useMemo(
    () => (completionsQ.data ?? []).filter(c => !signedIds.has(c.id)),
    [completionsQ.data, signedIds],
  );

  const recent = useMemo(
    () => (completionsQ.data ?? []).filter(c => signedIds.has(c.id)).slice(0, 20),
    [completionsQ.data, signedIds],
  );

  const needsRefresh = useMemo(
    () => (signoffsWithExpiryQ.data ?? []).filter(s => s.needs_refresh),
    [signoffsWithExpiryQ.data],
  );

  const moduleMap = useMemo(() => {
    const m = new Map<string, { title: string; required: boolean }>();
    for (const x of modulesQ.data ?? []) m.set(x.id, { title: x.title, required: x.required });
    return m;
  }, [modulesQ.data]);

  const agentIds = useMemo(
    () => Array.from(new Set([
      ...(completionsQ.data ?? []).map(c => c.agent_id),
      ...(signoffsWithExpiryQ.data ?? []).map(s => s.agent_id),
    ])),
    [completionsQ.data, signoffsWithExpiryQ.data],
  );
  const namesQ = useAgentNames(agentIds);
  const refresherIntervalsQ = useAgentRefresherIntervals(agentIds);

  const approveActive = async (note: string) => {
    if (!active) return;
    try {
      await createSignoff.mutateAsync({
        completion_id: active.id,
        module_id: active.module_id,
        campaign_id: active.campaign_id,
        agent_id: active.agent_id,
        signoff_note: note || undefined,
      });

      // Fire-and-forget: notify the agent their completion was approved
      const moduleName = moduleMap.get(active.module_id)?.title ?? 'the module';
      supabase.from('notifications').insert({
        user_id: active.agent_id,
        title: 'Training Module Approved',
        message: `Your completion of "${moduleName}" has been approved by your supervisor.`,
        type: 'training',
        action_url: '/staff/agent/training',
      }).catch(() => {});

      const intervalMonths = refresherIntervalsQ.data?.get(active.agent_id) ?? 1;
      toast.success(`Training signed off. Refresher due in ${intervalMonths} month(s).`);
      setActive(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      if (msg.includes('unique') || msg.includes('duplicate')) {
        toast.error('This completion has already been signed off.');
      } else {
        toast.error('Failed to approve completion.');
      }
    }
  };

  const rejectActive = async () => {
    if (!active) return;
    try {
      await deleteCompletion.mutateAsync(active.id);

      // Fire-and-forget: notify the agent their completion was not approved
      const moduleName = moduleMap.get(active.module_id)?.title ?? 'the module';
      supabase.from('notifications').insert({
        user_id: active.agent_id,
        title: 'Training Completion Rejected',
        message: `Your completion of "${moduleName}" was not approved. Please review the material and resubmit.`,
        type: 'training',
        action_url: '/staff/agent/training',
      }).catch(() => {});

      toast.success('Completion cleared');
      setActive(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      toast.error(msg || 'Failed to reject completion.');
    }
  };

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Training Signoffs</h1>
                <p className="text-muted-foreground mt-0.5">Review and approve agent training completions</p>
              </div>
            </div>
            <Button onClick={() => setAssignOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Assign Training
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pending.length > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="needs-refresh" className="gap-2">
              Needs Refresh
              {needsRefresh.length > 0 && (
                <span className="bg-orange-500 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">
                  {needsRefresh.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent">Recently Signed Off</TabsTrigger>
          </TabsList>

          {/* Tab 1 — Pending */}
          <TabsContent value="pending" className="mt-4">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  All caught up. No completions awaiting signoff.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pending.map(c => {
                  const mod = moduleMap.get(c.module_id);
                  const name = namesQ.data?.get(c.agent_id) ?? c.agent_id.slice(0, 8);
                  return (
                    <Card key={c.id}>
                      <CardContent className="py-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{mod?.title ?? 'Unknown module'}</span>
                            {mod?.required && <Badge variant="outline">Required</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {name} · completed {new Date(c.completed_at).toLocaleString()}
                          </div>
                          {c.agent_notes && (
                            <div className="text-xs italic text-muted-foreground">"{c.agent_notes}"</div>
                          )}
                        </div>
                        <Button size="sm" onClick={() => setActive(c)}>Review</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 2 — Needs Refresh */}
          <TabsContent value="needs-refresh" className="mt-4">
            {needsRefresh.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  <RefreshCw className="h-5 w-5 mx-auto mb-2 opacity-40" />
                  No signoffs flagged for refresh.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {needsRefresh.map(s => {
                  const mod = moduleMap.get(s.module_id);
                  const name = namesQ.data?.get(s.agent_id) ?? s.agent_id.slice(0, 8);
                  return (
                    <Card key={s.id} className="border-orange-200">
                      <CardContent className="py-3 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{mod?.title ?? 'Unknown module'}</span>
                          <Badge className="bg-orange-500 hover:bg-orange-500 gap-1">
                            <RefreshCw className="h-3 w-3" />Needs Refresh
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {name} · signed off {format(new Date(s.signed_off_at), 'MMM d, yyyy')}
                        </div>
                        {s.refresh_reason && (
                          <div className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1">
                            Reason: {s.refresh_reason}
                          </div>
                        )}
                        {s.expires_at && (
                          <div className="text-xs text-muted-foreground">
                            Expires: {format(new Date(s.expires_at), 'MMM d, yyyy')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 3 — Recent */}
          <TabsContent value="recent" className="mt-4">
            {recent.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No recently signed-off completions.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recent.map(c => {
                  const mod = moduleMap.get(c.module_id);
                  const name = namesQ.data?.get(c.agent_id) ?? c.agent_id.slice(0, 8);
                  return (
                    <Card key={c.id} className="opacity-75">
                      <CardContent className="py-2 flex items-center justify-between gap-2 text-sm">
                        <div>
                          <span className="font-medium">{mod?.title ?? 'Module'}</span>
                          <span className="text-xs text-muted-foreground ml-2">{name}</span>
                        </div>
                        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3" />Signed off
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Review dialog */}
        {active && (
          <ReviewDialog
            completion={active}
            moduleName={moduleMap.get(active.module_id)?.title ?? '—'}
            agentName={namesQ.data?.get(active.agent_id) ?? active.agent_id.slice(0, 8)}
            onApprove={approveActive}
            onReject={rejectActive}
            onClose={() => setActive(null)}
            approving={createSignoff.isPending}
            rejecting={deleteCompletion.isPending}
          />
        )}
      </div>

      <AssignTrainingDialog open={assignOpen} onClose={() => setAssignOpen(false)} />
    </StaffLayout>
  );
}
