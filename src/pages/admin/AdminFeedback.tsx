import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Inbox, ExternalLink, MessageSquare, Bug, HelpCircle, Lightbulb, AlertTriangle, CheckCircle2, PlayCircle, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { needsActionScore } from '@/lib/feedback/needsActionScore';
import { firstResponseAgeRatio } from '@/lib/feedback/sla';
import { AgePill } from '@/components/feedback/AgePill';
import { AssigneeCell } from '@/components/feedback/AssigneeCell';
import { InternalNoteDialog } from '@/components/feedback/InternalNoteDialog';
import { updateFeedbackStatus, type FeedbackAction } from '@/lib/feedback/api';
import { LinkedWorkSection } from '@/components/feedback/LinkedWorkSection';
import { FeedbackHistoryList } from '@/components/feedback/FeedbackHistoryList';
import { FeedbackReplyComposer } from '@/components/feedback/FeedbackReplyComposer';

type Row = {
  id: string;
  title: string | null;
  description: string | null;
  type: string | null;
  status: string;
  priority: string;
  source_dashboard: string | null;
  role: string | null;
  page: string | null;
  created_by_email: string | null;
  metadata: any;
  created_at: string;
  resolved_at: string | null;
  internal_notes: any[];
  assigned_to: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  admin: 'Admin', supervisor: 'Supervisor', agent: 'Agent', sales: 'Sales',
  billing: 'Billing', tech: 'Tech', hr: 'HR', direct_client: 'Direct Client',
  affiliate: 'Affiliate', wl_partner_product: 'WL Product',
  wl_partner_escalation: 'WL Escalation',
};

const SOURCE_BUCKETS: Record<string, (s: string | null) => boolean> = {
  all: () => true,
  direct: (s) => s === 'direct_client',
  staff: (s) => ['admin','supervisor','agent','sales','billing','tech','hr','affiliate'].includes(s ?? ''),
  wl_product: (s) => s === 'wl_partner_product',
  wl_escalation: (s) => s === 'wl_partner_escalation',
};

const TYPE_ICON: Record<string, any> = { bug: Bug, help: HelpCircle, idea: Lightbulb, feedback: MessageSquare };

type ViewKey = 'triage' | 'mine' | 'active' | 'all_open' | 'resolved';

export default function AdminFeedback() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewKey>('triage');
  const [sourceBucket, setSourceBucket] = useState<keyof typeof SOURCE_BUCKETS>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<Row | null>(null);
  const [bridge, setBridge] = useState<{ status: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{ action: FeedbackAction; title: string; description: string; confirm: string } | null>(null);
  const [auxNote, setAuxNote] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(500);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel('feedback-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Refresh active row when underlying rows change
  useEffect(() => {
    if (!active) return;
    const fresh = rows.find(r => r.id === active.id);
    if (fresh) setActive(fresh);
  }, [rows, active?.id]);

  // Load bridge status when active row is an escalation
  useEffect(() => {
    setBridge(null);
    if (!active || active.source_dashboard !== 'wl_partner_escalation') return;
    supabase.from('wl_partner_feedback_escalations')
      .select('status').eq('linked_feedback_id', active.id).maybeSingle()
      .then(({ data }) => setBridge(data ? { status: (data as any).status } : null));
  }, [active?.id, active?.source_dashboard]);

  const filtered = useMemo(() => {
    const now = new Date();
    let list = rows.filter(r => SOURCE_BUCKETS[sourceBucket](r.source_dashboard));
    if (typeFilter !== 'all') list = list.filter(r => (r.type ?? 'feedback') === typeFilter);
    if (priorityFilter !== 'all') list = list.filter(r => r.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.title || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    }
    switch (view) {
      case 'triage': list = list.filter(r => r.assigned_to === null && r.status === 'new'); break;
      case 'mine': list = list.filter(r => r.assigned_to === user?.id && !['resolved','closed'].includes(r.status)); break;
      case 'active': list = list.filter(r => ['triaged','in_progress'].includes(r.status)); break;
      case 'all_open': list = list.filter(r => !['resolved','closed'].includes(r.status)); break;
      case 'resolved': {
        const cutoff = subDays(now, 30);
        list = list.filter(r => ['resolved','closed'].includes(r.status) && r.resolved_at && isAfter(new Date(r.resolved_at), cutoff));
        break;
      }
    }
    list.sort((a, b) => needsActionScore(b, now) - needsActionScore(a, now)
      || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return list;
  }, [rows, view, sourceBucket, typeFilter, priorityFilter, search, user?.id]);

  const kpis = useMemo(() => {
    const now = new Date();
    const open = rows.filter(r => !['resolved','closed'].includes(r.status));
    const oneWeek = subDays(now, 7);
    return {
      triage: rows.filter(r => r.assigned_to === null && r.status === 'new').length,
      active: rows.filter(r => ['triaged','in_progress'].includes(r.status)).length,
      escalations: open.filter(r => r.source_dashboard === 'wl_partner_escalation').length,
      aging: open.filter(r => {
        const ratio = firstResponseAgeRatio(r.created_at, r.status, r.type ?? 'feedback', r.priority, now);
        return ratio !== null && ratio > 1;
      }).length,
      resolvedWeek: rows.filter(r => ['resolved','closed'].includes(r.status) && r.resolved_at && isAfter(new Date(r.resolved_at), oneWeek)).length,
    };
  }, [rows]);

  const runAction = async (action: FeedbackAction, opts: { id: string; assignee_id?: string | null; internal_note?: string } = { id: active?.id ?? '' }) => {
    if (!opts.id) return;
    setBusy(true);
    try {
      await updateFeedbackStatus({ table: 'feedback', id: opts.id, action, assignee_id: opts.assignee_id, internal_note: opts.internal_note });
      toast.success('Updated');
      load();
      setNoteDialog(null);
    } catch (e: any) {
      toast.error('Action failed', { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const openNote = (action: FeedbackAction, title: string, description: string, confirm: string) =>
    setNoteDialog({ action, title, description, confirm });

  const addAuxNote = async () => {
    if (!active || !auxNote.trim()) return;
    setBusy(true);
    try {
      // Use API in "in_progress" mode is invalid. Persist note via direct update; admin RLS allows it.
      const newNote = { author_id: user?.id, author_email: user?.email, body: auxNote.trim(), at: new Date().toISOString() };
      const next = [...(active.internal_notes ?? []), newNote];
      const { error } = await supabase.from('feedback').update({ internal_notes: next as any }).eq('id', active.id);
      if (error) throw error;
      setAuxNote('');
      load();
    } catch (e: any) {
      toast.error('Failed', { description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6" />Feedback Queue</h1>
        <p className="text-muted-foreground mt-1">Direct feedback, partner product feedback, and partner-initiated escalations. Admin-handled.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Needs triage" value={kpis.triage} />
        <Kpi label="Active" value={kpis.active} />
        <Kpi label="WL escalations open" value={kpis.escalations} accent={kpis.escalations > 0 ? 'destructive' : undefined} />
        <Kpi label="Aging > target" value={kpis.aging} accent={kpis.aging > 0 ? 'amber' : undefined} />
        <Kpi label="Resolved this week" value={kpis.resolvedWeek} />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as ViewKey)}>
        <TabsList>
          <TabsTrigger value="triage">Needs triage</TabsTrigger>
          <TabsTrigger value="mine">Assigned to me</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="all_open">All open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved (30d)</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['all','direct','staff','wl_product','wl_escalation'] as const).map(k => (
              <Button key={k} size="sm" variant={sourceBucket === k ? 'default' : 'outline'} onClick={() => setSourceBucket(k)}>
                {k === 'all' ? 'All' : k === 'wl_product' ? 'WL Product' : k === 'wl_escalation' ? 'WL Escalation' : k.charAt(0).toUpperCase() + k.slice(1)}
              </Button>
            ))}
            <span className="border-l mx-1" />
            {(['all','bug','help','idea','feedback'] as const).map(k => (
              <Button key={k} size="sm" variant={typeFilter === k ? 'default' : 'ghost'} onClick={() => setTypeFilter(k)}>
                {k === 'all' ? 'All types' : k}
              </Button>
            ))}
            <span className="border-l mx-1" />
            {(['all','urgent','high','normal','low'] as const).map(k => (
              <Button key={k} size="sm" variant={priorityFilter === k ? 'default' : 'ghost'} onClick={() => setPriorityFilter(k)}>
                {k === 'all' ? 'All priorities' : k}
              </Button>
            ))}
          </div>
          <Input placeholder="Search title or description…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-sm text-muted-foreground">Loading…</div>
            : filtered.length === 0 ? <div className="py-12 text-sm text-muted-foreground text-center">Inbox zero in this view.</div>
            : (
              <div className="space-y-2">
                {filtered.map(r => {
                  const Icon = TYPE_ICON[r.type ?? 'feedback'] ?? MessageSquare;
                  const isEsc = r.source_dashboard === 'wl_partner_escalation';
                  return (
                    <div key={r.id}
                      className={`rounded-md border p-3 hover:bg-muted/50 transition cursor-pointer ${isEsc ? 'border-destructive/40 bg-destructive/5' : ''}`}
                      onClick={() => setActive(r)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <Badge variant={isEsc ? 'destructive' : 'outline'}>
                              {SOURCE_LABEL[r.source_dashboard || ''] || r.source_dashboard || 'unknown'}
                            </Badge>
                            <Badge variant={r.status === 'in_progress' ? 'default' : 'outline'}>{r.status}</Badge>
                            {(r.priority === 'urgent' || r.priority === 'high') && (
                              <Badge variant="outline" className="capitalize border-orange-500/40 text-orange-700 dark:text-orange-400">{r.priority}</Badge>
                            )}
                            <AgePill createdAt={r.created_at} status={r.status} type={r.type} priority={r.priority} />
                          </div>
                          <div className="font-medium truncate">{r.title || (r.description ?? '').slice(0, 100)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.created_by_email || 'unknown'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            {r.metadata?.partner_company && ` · Partner: ${r.metadata.partner_company}`}
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <AssigneeCell
                            assignedTo={r.assigned_to}
                            currentUserId={user?.id}
                            pickerMode="admin_handlers"
                            busy={busy}
                            onClaim={() => runAction('claim', { id: r.id })}
                            onAssign={(uid) => runAction('assign', { id: r.id, assignee_id: uid })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.title || 'Feedback detail'}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{SOURCE_LABEL[active.source_dashboard || ''] || active.source_dashboard}</Badge>
                  <Badge variant="outline" className="capitalize">{active.type}</Badge>
                  <Badge variant="outline">{active.status}</Badge>
                  <span className="text-xs">· {active.created_by_email || 'unknown'} · {formatDistanceToNow(new Date(active.created_at), { addSuffix: true })}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Description</div>
                  <p className="text-sm whitespace-pre-wrap rounded-md bg-muted/40 p-3">{active.description}</p>
                </div>

                {active.source_dashboard === 'wl_partner_escalation' && bridge && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />WL Partner escalation</div>
                    <div className="text-xs text-muted-foreground mt-1">Bridge status: <strong>{bridge.status}</strong></div>
                    {bridge.status === 'open' && (
                      <Button size="sm" className="mt-2" disabled={busy}
                        onClick={() => openNote('acknowledge_escalation', 'Acknowledge escalation', 'Notify the partner via the bridge that this escalation has been received. Optional internal note.', 'Acknowledge')}>
                        <BellRing className="h-3.5 w-3.5 mr-1" />Acknowledge escalation
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {active.status === 'new' && (
                    <Button size="sm" variant="outline" disabled={busy}
                      onClick={() => openNote('triage', 'Mark as triaged', 'Confirm priority and add a one-line plan. Note required.', 'Mark triaged')}>
                      Triage
                    </Button>
                  )}
                  {(active.status === 'new' || active.status === 'triaged') && (
                    <Button size="sm" variant="outline" disabled={busy}
                      onClick={() => runAction('in_progress', { id: active.id })}>
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />Start
                    </Button>
                  )}
                  {!['resolved','closed'].includes(active.status) && (
                    <>
                      <Button size="sm" disabled={busy}
                        onClick={() => openNote('resolve', 'Resolve', 'Describe what was done. Note required.', 'Resolve')}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => openNote('close', 'Close', 'Why are we closing without resolving? Note required.', 'Close')}>
                        Close
                      </Button>
                    </>
                  )}
                </div>

                {active.page && (
                  <div className="text-sm">
                    <span className="font-medium">Originating route: </span>
                    <Link to={active.page} className="text-primary inline-flex items-center gap-1 hover:underline">
                      {active.page} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {active.metadata && Object.keys(active.metadata).length > 0 && (
                  <details className="rounded-md border p-2">
                    <summary className="text-xs cursor-pointer text-muted-foreground">Metadata</summary>
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-x-auto mt-2">{JSON.stringify(active.metadata, null, 2)}</pre>
                  </details>
                )}

                <div>
                  <div className="text-sm font-medium mb-1 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Internal notes</div>
                  <div className="space-y-2 mb-2">
                    {(active.internal_notes ?? []).length === 0 && (
                      <div className="text-xs text-muted-foreground">No notes yet.</div>
                    )}
                    {(active.internal_notes ?? []).map((n: any, i: number) => (
                      <div key={i} className="text-sm rounded-md border p-2">
                        <div className="text-xs text-muted-foreground mb-1">{n.author_email} · {formatDistanceToNow(new Date(n.at), { addSuffix: true })}</div>
                        <div className="whitespace-pre-wrap">{n.body}</div>
                      </div>
                    ))}
                  </div>
                  <Textarea value={auxNote} onChange={(e) => setAuxNote(e.target.value)} placeholder="Add an internal note (optional)…" rows={3} />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="outline" onClick={addAuxNote} disabled={!auxNote.trim() || busy}>Add note</Button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />Conversation
                  </div>
                  <FeedbackHistoryList feedbackId={active.id} mode="admin" />
                  <div className="mt-3">
                    <FeedbackReplyComposer
                      feedbackId={active.id}
                      parentStatus={active.status}
                      mode="admin"
                      onPosted={load}
                    />
                  </div>
                </div>

                <LinkedWorkSection table="feedback" feedbackId={active.id} canEdit={true} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {noteDialog && active && (
        <InternalNoteDialog
          open
          onOpenChange={(o) => !o && setNoteDialog(null)}
          title={noteDialog.title}
          description={noteDialog.description}
          confirmLabel={noteDialog.confirm}
          required={noteDialog.action !== 'acknowledge_escalation'}
          busy={busy}
          onConfirm={(note) => runAction(noteDialog.action, { id: active.id, internal_note: note })}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: 'destructive' | 'amber' }) {
  const className =
    accent === 'destructive' ? 'text-destructive'
    : accent === 'amber' ? 'text-amber-700 dark:text-amber-400'
    : '';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl ${className}`}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
