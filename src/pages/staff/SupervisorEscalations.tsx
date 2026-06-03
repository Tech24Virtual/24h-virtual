import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, PlusCircle, CheckCircle, Search } from 'lucide-react';

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

export default function SupervisorEscalations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    target_department: '', subject: '', description: '', priority: 'medium',
  });

  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ['supervisor-escalations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisor_escalations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createEscalation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supervisor_escalations').insert({
        supervisor_id: user!.id,
        target_department: form.target_department,
        subject: form.subject,
        description: form.description || null,
        priority: form.priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-escalations'] });
      toast({ title: 'Escalation created' });
      setCreateDialog(false);
      setForm({ target_department: '', subject: '', description: '', priority: 'medium' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-escalations'] });
      toast({ title: 'Escalation resolved' });
      setResolveDialog(null);
      setResolutionNotes('');
    },
  });

  const filtered = escalations.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.subject.toLowerCase().includes(q) || e.target_department.toLowerCase().includes(q);
  });

  const openCount = escalations.filter(e => e.status === 'open').length;

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escalations</h1>
            <p className="text-muted-foreground">Escalate issues to HR, Billing, Sales, or Admin</p>
          </div>
          <Button onClick={() => setCreateDialog(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Escalation
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{openCount}</p>
                  <p className="text-sm text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{escalations.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{escalations.filter(e => e.status === 'resolved').length}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search escalations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No escalations</TableCell></TableRow>
                ) : filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.subject}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{e.target_department}</Badge></TableCell>
                    <TableCell><Badge variant={priorityColors[e.priority] as any} className="capitalize">{e.priority}</Badge></TableCell>
                    <TableCell><Badge variant={statusColors[e.status] as any} className="capitalize">{e.status}</Badge></TableCell>
                    <TableCell>{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {e.status !== 'resolved' && (
                        <Button size="sm" variant="outline" onClick={() => setResolveDialog(e.id)}>Resolve</Button>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Create Escalation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Target Department</label>
              <Select value={form.target_department} onValueChange={v => setForm(f => ({ ...f, target_department: v }))}>
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
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description..." />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
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
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createEscalation.mutate()} disabled={!form.target_department || !form.subject}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Escalation</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium">Resolution Notes</label>
            <Textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="How was this resolved?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button onClick={() => resolveDialog && resolveEscalation.mutate(resolveDialog)}>Mark Resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
