import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, CheckCircle2, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAgentPublishedModules, type CampaignTrainingModule } from '@/hooks/campaign-os/useCampaignTrainingModules';
import { useMyCompletions, useMarkComplete } from '@/hooks/campaign-os/useTrainingCompletions';
import { useMySignoffs } from '@/hooks/campaign-os/useTrainingSignoffs';

type Status = 'not-started' | 'pending-signoff' | 'signed-off';

export default function AgentTraining() {
  const modulesQ = useAgentPublishedModules();
  const completionsQ = useMyCompletions();
  const signoffsQ = useMySignoffs();
  const markComplete = useMarkComplete();

  const [active, setActive] = useState<CampaignTrainingModule | null>(null);
  const [notes, setNotes] = useState('');

  const completionByModule = useMemo(() => {
    const map = new Map<string, string>(); // module_id -> completion_id
    for (const c of completionsQ.data ?? []) map.set(c.module_id, c.id);
    return map;
  }, [completionsQ.data]);

  const signoffByCompletion = useMemo(() => {
    const map = new Map<string, true>();
    for (const s of signoffsQ.data ?? []) map.set(s.completion_id, true);
    return map;
  }, [signoffsQ.data]);

  const statusFor = (m: CampaignTrainingModule): Status => {
    const cId = completionByModule.get(m.id);
    if (!cId) return 'not-started';
    return signoffByCompletion.has(cId) ? 'signed-off' : 'pending-signoff';
  };

  const open = (m: CampaignTrainingModule) => {
    setActive(m);
    setNotes('');
  };

  const submitCompletion = async () => {
    if (!active) return;
    try {
      await markComplete.mutateAsync({
        module_id: active.id,
        campaign_id: active.campaign_id,
        agent_notes: notes.trim() || undefined,
      });
      toast.success('Marked complete — awaiting supervisor signoff');
      setActive(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isLoading = modulesQ.isLoading || completionsQ.isLoading || signoffsQ.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          My Training
        </h1>
        <p className="text-sm text-muted-foreground">
          Read each module and mark it complete. A supervisor will sign off before it counts toward your campaign readiness.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (modulesQ.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No training modules assigned yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {modulesQ.data?.map((m) => {
            const status = statusFor(m);
            return (
              <Card key={m.id}>
                <CardContent className="py-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{m.title}</span>
                      {m.required && <Badge variant="outline">Required</Badge>}
                      <StatusBadge status={status} />
                    </div>
                    {m.summary && <div className="text-xs text-muted-foreground">{m.summary}</div>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => open(m)}>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Open
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              {active.summary && <div className="text-sm text-muted-foreground">{active.summary}</div>}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Module content</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm font-sans">{active.body_md || '(No content yet)'}</pre>
                </CardContent>
              </Card>
              {statusFor(active) === 'not-started' ? (
                <>
                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything you want your supervisor to know"
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {statusFor(active) === 'pending-signoff'
                    ? 'You marked this complete. Waiting on supervisor signoff.'
                    : 'Signed off. Nothing more to do.'}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
            {active && statusFor(active) === 'not-started' && (
              <Button onClick={submitCompletion} disabled={markComplete.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'signed-off') return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Signed off</Badge>;
  if (status === 'pending-signoff') return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending signoff</Badge>;
  return <Badge variant="outline">Not started</Badge>;
}
