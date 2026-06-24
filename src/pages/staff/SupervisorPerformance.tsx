import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Star, PlusCircle, Eye, Send, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  agent_id: string;
  reviewer_id: string | null;
  period_start: string | null;
  period_end: string | null;
  quality_score: number | null;
  attendance_score: number | null;
  communication_score: number | null;
  overall_score: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const defaultForm = {
  agent_id: '',
  period_start: '',
  period_end: '',
  quality_score: 3,
  attendance_score: 3,
  communication_score: 3,
  strengths: '',
  areas_for_improvement: '',
  notes: '',
};

// ── Sub-components (defined outside to avoid re-mount on render) ──────────────

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value} / 5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const val = score ?? 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{val} / 5</span>
      </div>
      <Progress value={(val / 5) * 100} className="h-2" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorPerformance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [createDialog, setCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [agentFilter, setAgentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['performance-reviews'],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('agent_performance_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agent-users-for-reviews'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'agent');
      const ids = (roles ?? []).map(r => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
        .order('full_name');
      return data ?? [];
    },
  });

  const agentMap = useMemo(() => new Map(agents.map(a => [a.id, a.full_name])), [agents]);

  const filtered = useMemo(() => reviews.filter(r => {
    if (agentFilter !== 'all' && r.agent_id !== agentFilter) return false;
    if (search) {
      const name = (agentMap.get(r.agent_id) ?? '').toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [reviews, agentFilter, search, agentMap]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fmtDate = (d: string | null) => d ? format(new Date(d), 'MMM d, yyyy') : '—';

  const overallVariant = (score: number | null): 'default' | 'secondary' | 'destructive' => {
    if (score == null) return 'secondary';
    if (score >= 4)    return 'default';
    if (score >= 3)    return 'secondary';
    return 'destructive';
  };

  const closeDialog = () => { setCreateDialog(false); setEditingId(null); setForm(defaultForm); };

  const openEdit = (r: Review) => {
    setEditingId(r.id);
    setForm({
      agent_id:              r.agent_id,
      period_start:          r.period_start ?? '',
      period_end:            r.period_end ?? '',
      quality_score:         r.quality_score ?? 3,
      attendance_score:      r.attendance_score ?? 3,
      communication_score:   r.communication_score ?? 3,
      strengths:             r.strengths ?? '',
      areas_for_improvement: r.areas_for_improvement ?? '',
      notes:                 r.notes ?? '',
    });
    setCreateDialog(true);
  };

  const handleSubmit = () => {
    if (!form.period_start || !form.period_end) return;
    if (new Date(form.period_end) <= new Date(form.period_start)) {
      toast.error('End date must be after start date');
      return;
    }
    submitForm.mutate();
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const submitForm = useMutation({
    mutationFn: async () => {
      // overall_score is GENERATED ALWAYS AS (STORED) — DB computes it automatically.
      // Including it in the payload causes "cannot insert non-default value" error.
      const payload = {
        agent_id:              form.agent_id,
        period_start:          form.period_start,
        period_end:            form.period_end,
        quality_score:         form.quality_score,
        attendance_score:      form.attendance_score,
        communication_score:   form.communication_score,
        strengths:             form.strengths || null,
        areas_for_improvement: form.areas_for_improvement || null,
        notes:                 form.notes || null,
      };
      if (editingId) {
        const { error } = await (supabase as any)
          .from('agent_performance_reviews')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('agent_performance_reviews')
          .insert({ ...payload, reviewer_id: user!.id, status: 'draft' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success(editingId ? 'Review updated' : 'Review created');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('agent_performance_reviews')
        .update({ status: 'published' })
        .eq('id', id);
      if (error) throw error;
      const review = reviews.find(r => r.id === id);
      if (review) {
        await (supabase as any).from('notifications').insert({
          user_id:    review.agent_id,
          title:      'Performance Review Published',
          message:    'Your supervisor has published a performance review. Check your profile to view it.',
          category:   'performance',
          action_url: '/staff/agent/my-profile',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success('Review published. Agent can now see it.');
      setConfirmPublishId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('agent_performance_reviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success('Draft deleted');
      setConfirmDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">

        {/* Gradient header */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                Performance Reviews
              </h1>
              <p className="text-muted-foreground mt-1">Evaluate and track agent performance</p>
            </div>
            <Button onClick={() => setCreateDialog(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" /> New Review
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-primary" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{reviews.length}</p>}
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Pencil className="h-5 w-5 text-amber-500" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{reviews.filter(r => r.status === 'draft').length}</p>}
                  <p className="text-sm text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-green-500" />
                <div>
                  {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold">{reviews.filter(r => r.status === 'published').length}</p>}
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by agent name…"
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

        {/* Reviews table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Communication</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setViewReview(r)}
                  >
                    <TableCell>
                      <p className="font-medium">{agentMap.get(r.agent_id) ?? 'Unknown'}</p>
                      <Link
                        to={`/staff/supervisor/agents/${r.agent_id}`}
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
                        onClick={e => e.stopPropagation()}
                      >
                        View Agent <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                    </TableCell>
                    <TableCell className="text-sm">{r.quality_score ?? '—'}/5</TableCell>
                    <TableCell className="text-sm">{r.attendance_score ?? '—'}/5</TableCell>
                    <TableCell className="text-sm">{r.communication_score ?? '—'}/5</TableCell>
                    <TableCell>
                      {r.overall_score != null
                        ? <Badge variant={overallVariant(r.overall_score)}>{Number(r.overall_score).toFixed(1)}</Badge>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'published' ? 'default' : 'outline'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0"
                          title="View details"
                          onClick={() => setViewReview(r)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === 'draft' && (
                          <>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Edit draft"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 h-7 px-2 text-xs"
                              onClick={() => setConfirmPublishId(r.id)}
                            >
                              <Send className="h-3 w-3" /> Publish
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete draft"
                              onClick={() => setConfirmDeleteId(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── View detail dialog ───────────────────────────────────────────── */}
      <Dialog open={!!viewReview} onOpenChange={open => { if (!open) setViewReview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Performance Review</DialogTitle>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-5">
              <div>
                <p className="text-lg font-semibold">{agentMap.get(viewReview.agent_id) ?? 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(viewReview.period_start)} – {fmtDate(viewReview.period_end)}
                </p>
              </div>

              <div className="space-y-3">
                <ScoreBar label="Quality"       score={viewReview.quality_score} />
                <ScoreBar label="Attendance"    score={viewReview.attendance_score} />
                <ScoreBar label="Communication" score={viewReview.communication_score} />
                {viewReview.overall_score != null && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Overall</span>
                    <Badge variant={overallVariant(viewReview.overall_score)}>
                      {Number(viewReview.overall_score).toFixed(1)} / 5
                    </Badge>
                  </div>
                )}
              </div>

              {(viewReview.strengths || viewReview.areas_for_improvement || viewReview.notes) && (
                <div className="space-y-3 border-t pt-4">
                  {viewReview.strengths && (
                    <div>
                      <p className="text-sm font-medium mb-1">Strengths</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewReview.strengths}</p>
                    </div>
                  )}
                  {viewReview.areas_for_improvement && (
                    <div>
                      <p className="text-sm font-medium mb-1">Areas for Improvement</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewReview.areas_for_improvement}</p>
                    </div>
                  )}
                  {viewReview.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewReview.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReview(null)}>Close</Button>
            {viewReview?.status === 'draft' && (
              <Button onClick={() => { if (viewReview) { const r = viewReview; setViewReview(null); openEdit(r); } }}>
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={createDialog} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Performance Review' : 'Create Performance Review'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-14rem)] pr-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Agent</label>
              <Select value={form.agent_id} onValueChange={v => setForm(f => ({ ...f, agent_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Period Start</label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Period End</label>
                <Input type="date" value={form.period_end} min={form.period_start || undefined} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>

            <ScoreSlider label="Quality"       value={form.quality_score}       onChange={v => setForm(f => ({ ...f, quality_score: v }))} />
            <ScoreSlider label="Attendance"    value={form.attendance_score}    onChange={v => setForm(f => ({ ...f, attendance_score: v }))} />
            <ScoreSlider label="Communication" value={form.communication_score} onChange={v => setForm(f => ({ ...f, communication_score: v }))} />

            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Overall score: <span className="font-semibold text-foreground">
                {((form.quality_score + form.attendance_score + form.communication_score) / 3).toFixed(1)} / 5
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Strengths</label>
              <Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} placeholder="What did this agent do well?" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Areas for Improvement</label>
              <Textarea value={form.areas_for_improvement} onChange={e => setForm(f => ({ ...f, areas_for_improvement: e.target.value }))} rows={2} placeholder="What should the agent work on?" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional context or follow-up…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.agent_id || !form.period_start || !form.period_end || submitForm.isPending}
            >
              {submitForm.isPending ? 'Saving…' : editingId ? 'Update Review' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Publish confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!confirmPublishId} onOpenChange={open => { if (!open) setConfirmPublishId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this review?</AlertDialogTitle>
            <AlertDialogDescription>
              The agent will be able to see it immediately and will receive a notification. Published reviews cannot be edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPublishId && publishReview.mutate(confirmPublishId)}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft review?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && deleteReview.mutate(confirmDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </StaffLayout>
  );
}
