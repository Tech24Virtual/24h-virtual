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
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { Star, PlusCircle, Eye, Send } from 'lucide-react';

export default function SupervisorPerformance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({
    agent_id: '', period_start: '', period_end: '',
    quality_score: 3, attendance_score: 3, communication_score: 3,
    strengths: '', areas_for_improvement: '', notes: '',
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['performance-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_performance_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agent-users-for-reviews'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'agent');
      const ids = roles?.map(r => r.user_id) || [];
      if (ids.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      return data || [];
    },
  });

  const agentMap = new Map(agents.map(a => [a.id, a.full_name]));

  const createReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('agent_performance_reviews').insert({
        agent_id: form.agent_id,
        reviewer_id: user!.id,
        period_start: form.period_start,
        period_end: form.period_end,
        quality_score: form.quality_score,
        attendance_score: form.attendance_score,
        communication_score: form.communication_score,
        strengths: form.strengths || null,
        areas_for_improvement: form.areas_for_improvement || null,
        notes: form.notes || null,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review created' });
      setCreateDialog(false);
      setForm({ agent_id: '', period_start: '', period_end: '', quality_score: 3, attendance_score: 3, communication_score: 3, strengths: '', areas_for_improvement: '', notes: '' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const publishReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_performance_reviews').update({ status: 'published' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review published. Agent can now see it.' });
    },
  });

  const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}/5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Performance Reviews</h1>
            <p className="text-muted-foreground">Evaluate and track agent performance</p>
          </div>
          <Button onClick={() => setCreateDialog(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Review
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{reviews.length}</p>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{reviews.filter(r => r.status === 'draft').length}</p>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{reviews.filter(r => r.status === 'published').length}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </CardContent>
          </Card>
        </div>

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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : reviews.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reviews yet</TableCell></TableRow>
                ) : reviews.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{agentMap.get(r.agent_id) || 'Unknown'}</TableCell>
                    <TableCell>{r.period_start} to {r.period_end}</TableCell>
                    <TableCell>{r.quality_score}/5</TableCell>
                    <TableCell>{r.attendance_score}/5</TableCell>
                    <TableCell>{r.communication_score}/5</TableCell>
                    <TableCell>
                      <Badge variant={Number(r.overall_score) >= 4 ? 'default' : Number(r.overall_score) >= 3 ? 'secondary' : 'destructive'}>
                        {Number(r.overall_score).toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'published' ? 'default' : 'outline'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === 'draft' && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => publishReview.mutate(r.id)}>
                          <Send className="h-3 w-3" /> Publish
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Agent</label>
              <Select value={form.agent_id} onValueChange={v => setForm(f => ({ ...f, agent_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.id.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Period Start</label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Period End</label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <ScoreSlider label="Quality" value={form.quality_score} onChange={v => setForm(f => ({ ...f, quality_score: v }))} />
            <ScoreSlider label="Attendance" value={form.attendance_score} onChange={v => setForm(f => ({ ...f, attendance_score: v }))} />
            <ScoreSlider label="Communication" value={form.communication_score} onChange={v => setForm(f => ({ ...f, communication_score: v }))} />
            <div>
              <label className="text-sm font-medium">Strengths</label>
              <Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Areas for Improvement</label>
              <Textarea value={form.areas_for_improvement} onChange={e => setForm(f => ({ ...f, areas_for_improvement: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createReview.mutate()} disabled={!form.agent_id || !form.period_start || !form.period_end}>Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
