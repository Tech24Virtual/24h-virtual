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
const CONTENT_TYPES = ['feature', 'procedure', 'onboarding', 'faq', 'troubleshooting'];
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, BookOpen, Edit, Trash2 } from 'lucide-react';

const DASHBOARDS = ['admin', 'client', 'agent', 'supervisor', 'sales', 'billing', 'tech', 'hr', 'affiliate', 'white_label'];

export default function TechKnowledgeBase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDashboard, setFilterDashboard] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterContentType, setFilterContentType] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', dashboard: 'admin', is_active: true, content_type: 'feature', sort_order: 0, onboarding_step: null as number | null });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['platform-knowledge', filterDashboard, searchTerm],
    queryFn: async () => {
      let query = supabase.from('platform_knowledge').select('*').order('dashboard').order('sort_order').order('title');
      if (filterDashboard !== 'all') query = query.eq('dashboard', filterDashboard);
      if (filterContentType !== 'all') query = query.eq('content_type', filterContentType);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('platform_knowledge').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('platform_knowledge').insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-knowledge'] });
      toast({ title: editingId ? 'Entry updated' : 'Entry created' });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_knowledge').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-knowledge'] });
      toast({ title: 'Entry deleted' });
    },
  });

  const resetForm = () => {
    setForm({ title: '', description: '', dashboard: 'admin', is_active: true, content_type: 'feature', sort_order: 0, onboarding_step: null });
    setEditingId(null);
    setDialogOpen(false);
  };

  const startEdit = (entry: any) => {
    setForm({ title: entry.title, description: entry.description, dashboard: entry.dashboard, is_active: entry.is_active, content_type: entry.content_type || 'feature', sort_order: entry.sort_order || 0, onboarding_step: entry.onboarding_step });
    setEditingId(entry.id);
    setDialogOpen(true);
  };

  const grouped = entries?.reduce((acc: Record<string, any[]>, entry: any) => {
    (acc[entry.dashboard] = acc[entry.dashboard] || []).push(entry);
    return acc;
  }, {}) || {};

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">Manage PiP assistant knowledge entries</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetForm(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Create'} Knowledge Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Title / Topic" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Select value={form.dashboard} onValueChange={v => setForm(f => ({ ...f, dashboard: v }))}>
                  <SelectTrigger><SelectValue placeholder="Dashboard" /></SelectTrigger>
                  <SelectContent>
                    {DASHBOARDS.map(d => <SelectItem key={d} value={d} className="capitalize">{d.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Content / Description (supports markdown)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={6} />
                <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Content Type" /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Sort Order" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                  {form.content_type === 'onboarding' && (
                    <Input type="number" placeholder="Onboarding Step #" value={form.onboarding_step ?? ''} onChange={e => setForm(f => ({ ...f, onboarding_step: e.target.value ? parseInt(e.target.value) : null }))} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <span className="text-sm">Active</span>
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.title || !form.description || saveMutation.isPending}>
                  {editingId ? 'Update' : 'Create'} Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search knowledge base..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterContentType} onValueChange={setFilterContentType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Content type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDashboard} onValueChange={setFilterDashboard}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter dashboard" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dashboards</SelectItem>
              {DASHBOARDS.map(d => <SelectItem key={d} value={d} className="capitalize">{d.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : !entries?.length ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No knowledge entries found</CardContent></Card>
        ) : (
          Object.entries(grouped).map(([dashboard, items]) => (
            <Card key={dashboard}>
              <CardHeader>
                <CardTitle className="capitalize flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {dashboard.replace('_', ' ')} Dashboard
                  <Badge variant="secondary">{(items as any[]).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(items as any[]).map((entry: any) => (
                  <div key={entry.id} className="flex items-start justify-between border rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{entry.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">{entry.content_type || 'feature'}</Badge>
                        {entry.onboarding_step != null && <Badge variant="secondary" className="text-xs">Step {entry.onboarding_step}</Badge>}
                        {!entry.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(entry)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </StaffLayout>
  );
}
