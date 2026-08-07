import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertTriangle, CheckCircle, UserCheck, Filter, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TechSystemIssues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'medium', affected_department: '' });

  const { data: issues, isLoading } = useQuery({
    queryKey: ['tech-issues', filterStatus],
    queryFn: async () => {
      let query = supabase.from('tech_issues').select('*').order('created_at', { ascending: false });
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tech_issues').insert({
        ...form,
        reported_by: user!.id,
        affected_department: form.affected_department || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-issues'] });
      toast({ title: 'Issue created' });
      setCreateOpen(false);
      setForm({ title: '', description: '', category: 'other', priority: 'medium', affected_department: '' });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tech_issues').update({ assigned_to: user!.id, status: 'in_progress' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-issues'] });
      toast({ title: 'Issue assigned to you' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tech_issues').update({
        status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: resolutionNotes,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-issues'] });
      toast({ title: 'Issue resolved' });
      setResolveId(null);
      setResolutionNotes('');
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to resolve issue', description: error.message, variant: 'destructive' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tech_issues').update({ status: 'closed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-issues'] });
      toast({ title: 'Issue closed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to close issue', description: error.message, variant: 'destructive' });
    },
  });

  const priorityBadge = (p: string) => {
    const v: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { low: 'secondary', medium: 'outline', high: 'default', critical: 'destructive' };
    return <Badge variant={v[p] || 'outline'} className="capitalize">{p}</Badge>;
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { open: 'bg-yellow-100 text-yellow-800', investigating: 'bg-blue-100 text-blue-800', in_progress: 'bg-primary/10 text-primary', resolved: 'bg-green-100 text-green-800', closed: 'bg-muted text-muted-foreground' };
    return <Badge className={colors[s] || 'bg-muted text-muted-foreground'}>{s.replace('_', ' ')}</Badge>;
  };

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Issues</h1>
            <p className="text-muted-foreground">Track internal IT and platform issues</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Issue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create System Issue</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system_outage">System Outage</SelectItem>
                      <SelectItem value="access_request">Access Request</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={form.affected_department} onValueChange={v => setForm(f => ({ ...f, affected_department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Affected Department (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="supervisor">Operations</SelectItem>
                    <SelectItem value="agent">Agents</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.title || !form.description || createMutation.isPending}>
                  Create Issue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          {['open', 'in_progress', 'resolved', 'all'].map(s => (
            <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)} className="capitalize">
              {s.replace('_', ' ')}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !issues?.length ? (
              <div className="text-center py-8 text-muted-foreground">No issues found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue: any) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div className="font-medium">{issue.title}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">{issue.description}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{issue.category.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>{priorityBadge(issue.priority)}</TableCell>
                      <TableCell>{statusBadge(issue.status)}</TableCell>
                      <TableCell className="text-sm">{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!issue.assigned_to && issue.status === 'open' && (
                            <Button size="sm" variant="outline" onClick={() => claimMutation.mutate(issue.id)} disabled={claimMutation.isPending}>
                              <UserCheck className="h-4 w-4 mr-1" />Claim
                            </Button>
                          )}
                          {issue.status !== 'resolved' && issue.status !== 'closed' && (
                            <Dialog open={resolveId === issue.id} onOpenChange={open => { if (!open) setResolveId(null); else setResolveId(issue.id); }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost"><CheckCircle className="h-4 w-4 mr-1" />Resolve</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Resolve Issue</DialogTitle></DialogHeader>
                                <Textarea placeholder="Resolution notes..." value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={3} />
                                <Button onClick={() => resolveMutation.mutate(issue.id)} disabled={resolveMutation.isPending} className="w-full">Mark Resolved</Button>
                              </DialogContent>
                            </Dialog>
                          )}
                          {issue.status === 'resolved' && (
                            <Button size="sm" variant="ghost" onClick={() => closeMutation.mutate(issue.id)} disabled={closeMutation.isPending}>
                              <Archive className="h-4 w-4 mr-1" />Close
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
