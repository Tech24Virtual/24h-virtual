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
import { Calendar, PlusCircle, Clock, CheckCircle, XCircle, CalendarOff } from 'lucide-react';

const statusBadgeClass: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800 border border-amber-200',
  approved:  'bg-green-100 text-green-800 border border-green-200',
  denied:    'bg-red-100 text-red-800 border border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
};
const statusLabel: Record<string, string> = {
  pending:   'Pending',
  approved:  'Approved',
  denied:    'Denied',
  cancelled: 'Cancelled',
};

export default function AgentTimeOff() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [form, setForm] = useState({ request_type: 'day_off', start_date: '', end_date: '', reason: '' });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-time-off-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('time_off_requests').insert({
        agent_id: user!.id,
        request_type: form.request_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-time-off', user?.id] });
      toast({ title: 'Time off request submitted' });
      setCreateDialog(false);
      setForm({ request_type: 'day_off', start_date: '', end_date: '', reason: '' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('agent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-time-off', user?.id] });
      setCancelId(null);
      toast({ title: 'Request cancelled' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleSubmit = () => {
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast({ title: 'Invalid dates', description: 'End date must be on or after the start date', variant: 'destructive' });
      return;
    }
    createRequest.mutate();
  };

  return (
    <StaffLayout role="agent">
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Time Off</h1>
              <p className="text-muted-foreground">Request and manage your time off</p>
            </div>
            <Button onClick={() => setCreateDialog(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Request Time Off
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{requests.length}</p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{requests.filter(r => r.status === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'approved').length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  )) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <CalendarOff className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No time off requests yet</p>
                        <p className="text-muted-foreground/60 text-xs mt-1">Submit a request using the button above</p>
                      </TableCell>
                    </TableRow>
                  ) : requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="capitalize">{r.request_type.replace('_', ' ')}</TableCell>
                      <TableCell>{r.start_date}</TableCell>
                      <TableCell>{r.end_date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.reason || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass[r.status] ?? statusBadgeClass.pending}>
                          {statusLabel[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setCancelId(r.id)}
                          >
                            <XCircle className="h-4 w-4" />
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
      </div>

      {/* Create request dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Time Off</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day_off">Day Off</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.start_date || !form.end_date || createRequest.isPending}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelId} onOpenChange={open => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Time Off Request</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this request? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep Request</Button>
            <Button
              variant="destructive"
              onClick={() => cancelId && cancelRequest.mutate(cancelId)}
              disabled={cancelRequest.isPending}
            >
              Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
