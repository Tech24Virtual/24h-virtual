import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function HRContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ user_id: '', title: '', document_url: '', expires_at: '' });

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [cRes, eRes] = await Promise.all([
      (supabase as any).from('contracts').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false }),
      (supabase as any).from('profiles').select('id, full_name').order('full_name'),
    ]);
    setContracts(cRes.data || []);
    setEmployees(eRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    const { error } = await supabase.from('contracts').insert({
      user_id: form.user_id || null,
      title: form.title,
      document_url: form.document_url || null,
      expires_at: form.expires_at || null,
      status: 'pending',
    });
    if (error) { toast.error('Failed to create contract'); return; }

    // Notify employee
    if (form.user_id) {
      await supabase.from('notifications').insert({
        user_id: form.user_id,
        title: 'New contract ready for review',
        message: `A new contract "${form.title}" has been created for you.`,
        category: 'contract',
        action_url: '/hr-portal/hiring/contracts',
      });
    }

    toast.success('Contract created');
    setDialogOpen(false);
    setForm({ user_id: '', title: '', document_url: '', expires_at: '' });
    fetchData();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === 'signed') update.signed_at = new Date().toISOString();
    const { error } = await supabase.from('contracts').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Contract marked as ${status}`);
    fetchData();
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Contracts</h1>
            <p className="text-muted-foreground mt-1">Create and manage employee contracts</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Contract</Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
        ) : contracts.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">No contracts found.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {contracts.map(contract => (
              <Card key={contract.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{contract.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {contract.profiles?.full_name || 'Unassigned'} • Created {format(new Date(contract.created_at), 'MMM d, yyyy')}
                    </p>
                    {contract.expires_at && <p className="text-xs text-muted-foreground">Expires: {format(new Date(contract.expires_at), 'MMM d, yyyy')}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{contract.status || 'pending'}</Badge>
                    {contract.signed_at && <span className="text-xs text-muted-foreground">Signed {format(new Date(contract.signed_at), 'MMM d')}</span>}
                    {contract.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(contract.id, 'signed')}>Mark Signed</Button>
                    )}
                    {contract.document_url && (
                      <Button size="sm" variant="ghost" asChild><a href={contract.document_url} target="_blank" rel="noopener noreferrer">View</a></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Contract</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.user_id} onValueChange={v => setForm(p => ({ ...p, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name || 'Unnamed'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Employment Agreement" /></div>
            <div className="space-y-2"><Label>Document URL</Label><Input value={form.document_url} onChange={e => setForm(p => ({ ...p, document_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleCreate}>Create Contract</Button>
          </div>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
