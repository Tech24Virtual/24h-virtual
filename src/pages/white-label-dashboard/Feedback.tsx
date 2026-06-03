import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Inbox, Users, ClipboardList, Send, ArrowUpRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { needsActionScore } from '@/lib/feedback/needsActionScore';
import { firstResponseAgeRatio } from '@/lib/feedback/sla';
import { AgePill } from '@/components/feedback/AgePill';
import { AssigneeCell } from '@/components/feedback/AssigneeCell';
import { InternalNoteDialog } from '@/components/feedback/InternalNoteDialog';
import { bridgeStatusLabel, clientSafeStatusLabel } from '@/lib/feedback/clientSafeStatus';
import { updateFeedbackStatus, type FeedbackAction } from '@/lib/feedback/api';
import { LinkedWorkSection } from '@/components/feedback/LinkedWorkSection';
import { WLFeedbackThread } from '@/components/feedback/WLFeedbackThread';

type WLRow = {
  id: string;
  partner_id: string;
  origin: 'end_client' | 'partner_on_behalf';
  type: string;
  title: string | null;
  description: string;
  status: string;
  priority: string;
  source_dashboard: string;
  submitted_by_email: string | null;
  submitted_by_name: string | null;
  page: string | null;
  created_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  internal_notes: any[];
};
type DirectRow = {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  source_dashboard: string | null;
  created_at: string;
};
type BridgeRow = {
  wl_feedback_id: string;
  linked_feedback_id: string;
  status: string;
};

type SubView = 'triage' | 'mine' | 'active' | 'resolved';

export default function WLFeedbackQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [wlRows, setWlRows] = useState<WLRow[]>([]);
  const [directRows, setDirectRows] = useState<DirectRow[]>([]);
  const [bridges, setBridges] = useState<Record<string, BridgeRow>>({}); // by linked_feedback_id
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Sub-view per tab
  const [clientView, setClientView] = useState<SubView>('triage');
  const [teamView, setTeamView] = useState<SubView>('triage');

  // Escalation dialog
  const [escalating, setEscalating] = useState<WLRow | null>(null);
  const [summary, setSummary] = useState('');
  const [includeIdentity, setIncludeIdentity] = useState(false);
  const [escalateBusy, setEscalateBusy] = useState(false);

  // Internal note dialog
  const [noteDialog, setNoteDialog] = useState<{ row: WLRow; action: FeedbackAction; title: string; description: string; confirm: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('white_label_partners').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setPartnerId(data?.id ?? null));
  }, [user]);

  const load = async () => {
    if (!partnerId) return;
    setLoading(true);
    const [wl, direct] = await Promise.all([
      supabase.from('wl_partner_feedback').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('feedback').select('id,title,description,status,priority,source_dashboard,created_at')
        .in('source_dashboard', ['wl_partner_product', 'wl_partner_escalation'])
        .eq('metadata->>partner_id', partnerId)
        .order('created_at', { ascending: false }),
    ]);
    setWlRows((wl.data ?? []) as WLRow[]);
    setDirectRows((direct.data ?? []) as DirectRow[]);

    // Fetch bridges for any escalation rows
    const escIds = (direct.data ?? []).filter((r: any) => r.source_dashboard === 'wl_partner_escalation').map((r: any) => r.id);
    if (escIds.length > 0) {
      const { data: br } = await supabase.from('wl_partner_feedback_escalations')
        .select('wl_feedback_id, linked_feedback_id, status').in('linked_feedback_id', escIds);
      const map: Record<string, BridgeRow> = {};
      (br ?? []).forEach((b: any) => { map[b.linked_feedback_id] = b; });
      setBridges(map);
    } else {
      setBridges({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [partnerId]);

  // Realtime
  useEffect(() => {
    if (!partnerId) return;
    const ch = supabase.channel('wl-feedback-' + partnerId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wl_partner_feedback', filter: `partner_id=eq.${partnerId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wl_partner_feedback_escalations', filter: `partner_id=eq.${partnerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partnerId]);

  const sliceFor = (rows: WLRow[], view: SubView): WLRow[] => {
    const now = new Date();
    let list = rows;
    switch (view) {
      case 'triage': list = list.filter(r => r.assigned_to === null && r.status === 'new'); break;
      case 'mine': list = list.filter(r => r.assigned_to === user?.id && !['resolved','closed','escalated'].includes(r.status)); break;
      case 'active': list = list.filter(r => ['triaged','in_progress','escalated'].includes(r.status)); break;
      case 'resolved': {
        const cutoff = subDays(now, 30);
        list = list.filter(r => ['resolved','closed'].includes(r.status) && r.resolved_at && isAfter(new Date(r.resolved_at), cutoff));
        break;
      }
    }
    list.sort((a, b) => needsActionScore(b, now) - needsActionScore(a, now)
      || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return list;
  };

  const clientRequests = useMemo(() => wlRows.filter(r => r.origin === 'end_client'), [wlRows]);
  const teamLogged = useMemo(() => wlRows.filter(r => r.origin === 'partner_on_behalf'), [wlRows]);

  const kpis = useMemo(() => {
    const now = new Date();
    const oneWeek = subDays(now, 7);
    const escalatedDirect = directRows.filter(r => r.source_dashboard === 'wl_partner_escalation');
    return {
      clientOpen: clientRequests.filter(r => !['resolved','closed','escalated'].includes(r.status)).length,
      teamOpen: teamLogged.filter(r => !['resolved','closed','escalated'].includes(r.status)).length,
      escalationsOpen: escalatedDirect.filter(r => !['resolved','closed'].includes(r.status)).length,
      escalationsResolved: escalatedDirect.filter(r => ['resolved','closed'].includes(r.status)).length,
      resolvedWeek: wlRows.filter(r => ['resolved','closed'].includes(r.status) && r.resolved_at && isAfter(new Date(r.resolved_at), oneWeek)).length,
    };
  }, [wlRows, clientRequests, teamLogged, directRows]);

  const runAction = async (row: WLRow, action: FeedbackAction, internal_note?: string, assignee_id?: string | null) => {
    setBusy(true);
    try {
      await updateFeedbackStatus({ table: 'wl_partner_feedback', id: row.id, action, internal_note, assignee_id });
      toast({ title: 'Updated' });
      setNoteDialog(null);
      load();
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const submitEscalation = async () => {
    if (!escalating || !summary.trim()) return;
    setEscalateBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('escalate-feedback', {
        body: { wl_feedback_id: escalating.id, partner_summary: summary.trim(), include_end_client_identity: includeIdentity },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: 'Escalated', description: 'Sent to platform support.' });
      setEscalating(null); setSummary(''); setIncludeIdentity(false);
      load();
    } catch (e: any) {
      toast({ title: 'Could not escalate', description: e?.message, variant: 'destructive' });
    } finally {
      setEscalateBusy(false);
    }
  };

  return (
    <WhiteLabelLayout>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Feedback</h1>
        <p className="text-muted-foreground mt-1">Manage client requests, internal items, and product feedback to the platform.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Client requests open" value={kpis.clientOpen} />
        <Kpi label="My team logged open" value={kpis.teamOpen} />
        <Kpi label="Escalated, open / resolved" value={`${kpis.escalationsOpen} / ${kpis.escalationsResolved}`} />
        <Kpi label="Resolved this week" value={kpis.resolvedWeek} />
      </div>

      <Tabs defaultValue="client">
        <TabsList>
          <TabsTrigger value="client" className="gap-2">
            <Inbox className="h-4 w-4" /> Client requests
            <Badge variant="secondary" className="ml-1">{clientRequests.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" /> My team logged
            <Badge variant="secondary" className="ml-1">{teamLogged.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="product" className="gap-2">
            <ClipboardList className="h-4 w-4" /> My product feedback to platform
            <Badge variant="secondary" className="ml-1">{directRows.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="mt-4 space-y-3">
          <SubViewTabs view={clientView} setView={setClientView} />
          {loading ? <Loading /> : (
            <PartnerList
              rows={sliceFor(clientRequests, clientView)}
              currentUserId={user?.id}
              busy={busy}
              onClaim={(r) => runAction(r, 'claim', undefined, user!.id)}
              onTriage={(r) => setNoteDialog({ row: r, action: 'triage', title: 'Triage', description: 'Confirm priority and add a one-line plan.', confirm: 'Mark triaged' })}
              onStart={(r) => runAction(r, 'in_progress')}
              onResolve={(r) => setNoteDialog({ row: r, action: 'resolve', title: 'Resolve', description: 'Describe what was done.', confirm: 'Resolve' })}
              onClose={(r) => setNoteDialog({ row: r, action: 'close', title: 'Close', description: 'Why are we closing this without resolving?', confirm: 'Close' })}
              onEscalate={(r) => setEscalating(r)}
              emptyText="Nothing to handle here right now."
            />
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-3">
          <SubViewTabs view={teamView} setView={setTeamView} />
          {loading ? <Loading /> : (
            <PartnerList
              rows={sliceFor(teamLogged, teamView)}
              currentUserId={user?.id}
              busy={busy}
              onClaim={(r) => runAction(r, 'claim', undefined, user!.id)}
              onTriage={(r) => setNoteDialog({ row: r, action: 'triage', title: 'Triage', description: 'Confirm priority and add a one-line plan.', confirm: 'Mark triaged' })}
              onStart={(r) => runAction(r, 'in_progress')}
              onResolve={(r) => setNoteDialog({ row: r, action: 'resolve', title: 'Resolve', description: 'Describe what was done.', confirm: 'Resolve' })}
              onClose={(r) => setNoteDialog({ row: r, action: 'close', title: 'Close', description: 'Why are we closing without resolving?', confirm: 'Close' })}
              onEscalate={(r) => setEscalating(r)}
              emptyText="No internally-logged items in this view."
            />
          )}
        </TabsContent>

        <TabsContent value="product" className="mt-4">
          {loading ? <Loading /> : directRows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">No product feedback submitted yet.</div>
          ) : (
            <div className="space-y-3">
              {directRows.map(r => {
                const bridge = bridges[r.id];
                const label = r.source_dashboard === 'wl_partner_escalation' && bridge
                  ? bridgeStatusLabel(bridge.status)
                  : clientSafeStatusLabel(r.status);
                return (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{r.source_dashboard === 'wl_partner_escalation' ? 'Escalation' : 'Product'}</Badge>
                        <Badge variant="secondary">{label}</Badge>
                      </div>
                      <CardTitle className="text-base mt-1">{r.title || r.description?.slice(0, 80)}</CardTitle>
                      <CardDescription className="text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</CardDescription>
                    </CardHeader>
                    <CardContent><p className="text-sm whitespace-pre-wrap">{r.description}</p></CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Escalation dialog */}
      <Dialog open={!!escalating} onOpenChange={(o) => !o && setEscalating(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate to platform support</DialogTitle>
            <DialogDescription>Write a summary in your own words. Your client will not see this escalation or any reply.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="esc-summary">Your summary</Label>
              <Textarea id="esc-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} placeholder="Describe the issue and what you need." />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={includeIdentity} onCheckedChange={(c) => setIncludeIdentity(!!c)} />
              <span className="text-muted-foreground">
                Include end-client name and contact in the escalation. <span className="block text-xs">Off by default to protect your client relationship.</span>
              </span>
            </label>
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <div className="font-medium text-foreground">Preview, what the platform will see:</div>
              <div className="whitespace-pre-wrap">{summary.trim() || <span className="italic text-muted-foreground">Your summary will appear here.</span>}</div>
              <div className="pt-1">End-client identity: <strong>{includeIdentity ? 'included' : 'hidden'}</strong></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalating(null)} disabled={escalateBusy}>Cancel</Button>
            <Button onClick={submitEscalation} disabled={!summary.trim() || escalateBusy}>
              <Send className="h-4 w-4 mr-2" />{escalateBusy ? 'Sending…' : 'Escalate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {noteDialog && (
        <InternalNoteDialog
          open
          onOpenChange={(o) => !o && setNoteDialog(null)}
          title={noteDialog.title}
          description={noteDialog.description}
          confirmLabel={noteDialog.confirm}
          required
          busy={busy}
          onConfirm={(note) => runAction(noteDialog.row, noteDialog.action, note)}
        />
      )}
    </WhiteLabelLayout>
  );
}

function SubViewTabs({ view, setView }: { view: SubView; setView: (v: SubView) => void }) {
  return (
    <Tabs value={view} onValueChange={(v) => setView(v as SubView)}>
      <TabsList>
        <TabsTrigger value="triage">Needs triage</TabsTrigger>
        <TabsTrigger value="mine">Mine</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="resolved">Resolved (30d)</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function Loading() { return <div className="text-sm text-muted-foreground py-8">Loading…</div>; }

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'resolved' || status === 'closed' ? 'secondary'
    : status === 'in_progress' ? 'default'
    : status === 'escalated' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}

function PartnerList({
  rows, currentUserId, busy, emptyText,
  onClaim, onTriage, onStart, onResolve, onClose, onEscalate,
}: {
  rows: WLRow[];
  currentUserId?: string;
  busy?: boolean;
  emptyText: string;
  onClaim: (r: WLRow) => void;
  onTriage: (r: WLRow) => void;
  onStart: (r: WLRow) => void;
  onResolve: (r: WLRow) => void;
  onClose: (r: WLRow) => void;
  onEscalate: (r: WLRow) => void;
}) {
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-12 text-center">{emptyText}</div>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{r.type}</Badge>
                  <StatusBadge status={r.status} />
                  {(r.priority === 'urgent' || r.priority === 'high') && (
                    <Badge variant="outline" className="capitalize border-orange-500/40 text-orange-700 dark:text-orange-400">{r.priority}</Badge>
                  )}
                  <AgePill createdAt={r.created_at} status={r.status} type={r.type} priority={r.priority} />
                </div>
                <CardTitle className="text-base">{r.title || r.description.slice(0, 80)}</CardTitle>
                <CardDescription className="text-xs">
                  {r.submitted_by_name || r.submitted_by_email || 'Unknown sender'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  {r.page && ` · ${r.page}`}
                </CardDescription>
              </div>
              <AssigneeCell
                assignedTo={r.assigned_to}
                currentUserId={currentUserId}
                pickerMode="self_only"
                busy={busy}
                onClaim={() => onClaim(r)}
                onAssign={() => onClaim(r)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap mb-3">{r.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {r.status === 'new' && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onTriage(r)}>Triage</Button>
              )}
              {(r.status === 'new' || r.status === 'triaged') && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onStart(r)}>
                  <PlayCircle className="h-3.5 w-3.5 mr-1" />Start
                </Button>
              )}
              {!['resolved','closed','escalated'].includes(r.status) && (
                <>
                  <Button size="sm" disabled={busy} onClick={() => onResolve(r)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolve
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onClose(r)}>Close</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onEscalate(r)}>
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" />Escalate
                  </Button>
                </>
              )}
            </div>
            <LinkedWorkSection table="wl_partner_feedback" feedbackId={r.id} canEdit={true} />
            <div className="mt-4 border-t pt-4">
              <WLFeedbackThread feedbackId={r.id} parentStatus={r.status} mode="partner_owner" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
