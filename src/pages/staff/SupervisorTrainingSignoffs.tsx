import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useCampaignCompletions, useDeleteCompletion, type TrainingCompletion } from '@/hooks/campaign-os/useTrainingCompletions';
import { useSignoffs, useCreateSignoff } from '@/hooks/campaign-os/useTrainingSignoffs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useAllPublishedModules() {
  return useQuery({
    queryKey: ['campaign-os', 'all-published-modules'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_training_modules')
        .select('id, title, campaign_id, required');
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

export default function SupervisorTrainingSignoffs() {
  const completionsQ = useCampaignCompletions();
  const signoffsQ = useSignoffs();
  const modulesQ = useAllPublishedModules();
  const createSignoff = useCreateSignoff();
  const deleteCompletion = useDeleteCompletion();

  const signedIds = useMemo(
    () => new Set((signoffsQ.data ?? []).map((s) => s.completion_id)),
    [signoffsQ.data],
  );

  const pending = useMemo(
    () => (completionsQ.data ?? []).filter((c) => !signedIds.has(c.id)),
    [completionsQ.data, signedIds],
  );
  const recent = useMemo(
    () => (completionsQ.data ?? []).filter((c) => signedIds.has(c.id)).slice(0, 20),
    [completionsQ.data, signedIds],
  );

  const moduleMap = useMemo(() => {
    const m = new Map<string, { title: string; required: boolean }>();
    for (const x of modulesQ.data ?? []) m.set(x.id, { title: x.title, required: x.required });
    return m;
  }, [modulesQ.data]);

  const agentIds = useMemo(
    () => Array.from(new Set((completionsQ.data ?? []).map((c) => c.agent_id))),
    [completionsQ.data],
  );
  const namesQ = useAgentNames(agentIds);

  const [active, setActive] = useState<TrainingCompletion | null>(null);
  const [note, setNote] = useState('');

  const open = (c: TrainingCompletion) => {
    setActive(c);
    setNote('');
  };

  const approve = async () => {
    if (!active) return;
    try {
      await createSignoff.mutateAsync({
        completion_id: active.id,
        module_id: active.module_id,
        campaign_id: active.campaign_id,
        agent_id: active.agent_id,
        signoff_note: note.trim() || undefined,
      });
      toast.success('Signed off');
      setActive(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reject = async () => {
    if (!active) return;
    if (!confirm('Reject this completion? The agent will need to mark the module complete again.')) return;
    try {
      await deleteCompletion.mutateAsync(active.id);
      toast.success('Completion cleared');
      setActive(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Training Signoffs
        </h1>
        <p className="text-sm text-muted-foreground">
          Review agent completions and approve them so they count toward campaign readiness.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-2">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              All caught up. No completions awaiting signoff.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((c) => {
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
                    <Button size="sm" onClick={() => open(c)}>Review</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Recently signed off</h2>
          <div className="space-y-2">
            {recent.map((c) => {
              const mod = moduleMap.get(c.module_id);
              const name = namesQ.data?.get(c.agent_id) ?? c.agent_id.slice(0, 8);
              return (
                <Card key={c.id} className="opacity-70">
                  <CardContent className="py-2 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium">{mod?.title ?? 'Module'}</span>
                      <span className="text-xs text-muted-foreground ml-2">{name}</span>
                    </div>
                    <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Signed off</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review completion</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Module:</strong> {moduleMap.get(active.module_id)?.title ?? '—'}
              </div>
              <div>
                <strong>Agent:</strong> {namesQ.data?.get(active.agent_id) ?? active.agent_id.slice(0, 8)}
              </div>
              <div>
                <strong>Completed:</strong> {new Date(active.completed_at).toLocaleString()}
              </div>
              {active.agent_notes && (
                <div>
                  <strong>Agent notes:</strong>
                  <div className="italic text-muted-foreground mt-1">"{active.agent_notes}"</div>
                </div>
              )}
              <div>
                <label className="font-medium">Signoff note (optional)</label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={reject} disabled={deleteCompletion.isPending}>
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button onClick={approve} disabled={createSignoff.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

