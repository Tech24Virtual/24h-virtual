import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, UserMinus } from 'lucide-react';

export default function HROffboarding() {
  const { user } = useAuth();
  const [offboardings, setOffboardings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [form, setForm] = useState({ agent_id: '', reason: 'resignation', reason_details: '', last_working_day: '' });

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [offRes, empRes] = await Promise.all([
      (supabase as any).from('offboarding').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('profiles').select('id, full_name, employment_status').eq('employment_status', 'active').order('full_name'),
    ]);
    if (offRes.error) {
      toast.error('Failed to load offboardings');
      setOffboardings([]);
      setEmployees(empRes.data || []);
      setIsLoading(false);
      return;
    }

    // offboarding.agent_id has no FK relationship registered for PostgREST to
    // embed, so profiles are fetched separately and merged.
    const offData = offRes.data ?? [];
    const agentIds = [...new Set(offData.map((o: any) => o.agent_id))];
    const profilesById: Record<string, { full_name: string | null }> = {};
    if (agentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds as string[]);
      (profilesData ?? []).forEach(p => { profilesById[p.id] = { full_name: p.full_name }; });
    }

    setOffboardings(offData.map((o: any) => ({ ...o, profiles: profilesById[o.agent_id] ?? null })));
    setEmployees(empRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleInitiate = async () => {
    if (!form.agent_id) { toast.error('Select an employee'); return; }
    const { error } = await supabase.from('offboarding').insert({
      agent_id: form.agent_id,
      initiated_by: user!.id,
      reason: form.reason,
      reason_details: form.reason_details || null,
      last_working_day: form.last_working_day || null,
      status: 'initiated',
    });
    if (error) { toast.error('Failed to initiate offboarding'); return; }
    toast.success('Offboarding initiated');
    setInitDialogOpen(false);
    setForm({ agent_id: '', reason: 'resignation', reason_details: '', last_working_day: '' });
    fetchData();
  };

  const handleChecklistToggle = async (ob: any, field: string, value: boolean) => {
    const { error } = await supabase.from('offboarding').update({ [field]: value }).eq('id', ob.id);
    if (error) { toast.error('Failed to update'); return; }
    
    // Check if all items are done -> mark completed
    const updated = { ...ob, [field]: value };
    const allDone = updated.google_deprovisioned && updated.five9_deprovisioned && updated.slack_removed && updated.final_payout_processed && updated.equipment_returned;
    if (allDone && updated.status !== 'completed') {
      await supabase.from('offboarding').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', ob.id);
      await supabase.from('profiles').update({ employment_status: 'terminated' }).eq('id', ob.agent_id);
      toast.success('Offboarding completed — employee marked as terminated');
    }
    fetchData();
  };

  const checklistItems = [
    { field: 'google_deprovisioned', label: 'Deactivate Google Workspace' },
    { field: 'five9_deprovisioned', label: 'Remove Five9 Access' },
    { field: 'slack_removed', label: 'Remove from Slack' },
    { field: 'final_payout_processed', label: 'Process Final Payout' },
    { field: 'equipment_returned', label: 'Collect Equipment' },
  ];

  const statusColors: Record<string, string> = {
    initiated: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const active = offboardings.filter(o => o.status !== 'completed');
  const completed = offboardings.filter(o => o.status === 'completed');

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Offboarding</h1>
            <p className="text-muted-foreground mt-1">Manage employee departures and deprovisioning</p>
          </div>
          <Button onClick={() => setInitDialogOpen(true)}><UserMinus className="w-4 h-4 mr-2" /> Initiate Offboarding</Button>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : active.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No active offboardings.</CardContent></Card>
            ) : (
              active.map(ob => (
                <Card key={ob.id}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{ob.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          Reason: {ob.reason?.replace('_', ' ')} • Initiated {format(new Date(ob.created_at), 'MMM d, yyyy')}
                        </p>
                        {ob.last_working_day && <p className="text-sm text-muted-foreground">Last day: {format(new Date(ob.last_working_day), 'MMM d, yyyy')}</p>}
                      </div>
                      <Badge className={statusColors[ob.status] || ''}>{ob.status?.replace('_', ' ')}</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Checklist</p>
                      {checklistItems.map(item => (
                        <div key={item.field} className="flex items-center gap-2">
                          <Checkbox checked={ob[item.field]} onCheckedChange={(v) => handleChecklistToggle(ob, item.field, !!v)} />
                          <span className={`text-sm ${ob[item.field] ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {ob.reason_details && (
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{ob.reason_details}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completed.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No completed offboardings.</CardContent></Card>
            ) : (
              completed.map(ob => (
                <Card key={ob.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{ob.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {ob.reason?.replace('_', ' ')} • Completed {ob.completed_at ? format(new Date(ob.completed_at), 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Initiate Offboarding</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.agent_id} onValueChange={v => setForm(p => ({ ...p, agent_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name || 'Unnamed'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={v => setForm(p => ({ ...p, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resignation">Resignation</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="contract_end">Contract End</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Last Working Day</Label>
              <Input type="date" value={form.last_working_day} onChange={e => setForm(p => ({ ...p, last_working_day: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.reason_details} onChange={e => setForm(p => ({ ...p, reason_details: e.target.value }))} placeholder="Additional details..." rows={3} />
            </div>
            <Button className="w-full" onClick={handleInitiate}>Initiate Offboarding</Button>
          </div>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
