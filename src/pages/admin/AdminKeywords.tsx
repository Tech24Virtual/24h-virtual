import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Wand2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminKeywords() {
  const mrunsoxBanner = (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground mb-4">
      <strong className="text-foreground">📡 Mrunsox Integration:</strong> Keywords for 24Hvirtual.com content strategy are now managed in Mrunsox / Kingdom OS. This list is a read-only reference.
    </div>
  );
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('primary');
  const [newVolume, setNewVolume] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('medium');
  const [newTarget, setNewTarget] = useState('');

  const { data: keywords, isLoading } = useQuery({
    queryKey: ['admin-keywords', categoryFilter, search],
    queryFn: async () => {
      let query = supabase.from('keyword_tracker').select('*').order('sort_priority', { ascending: true }).order('search_volume', { ascending: false });
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (search) query = query.ilike('keyword', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('keyword_tracker').insert({
        keyword: newKeyword,
        category: newCategory,
        search_volume: parseInt(newVolume) || 0,
        difficulty: newDifficulty,
        target_page: newTarget || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-keywords'] });
      toast.success('Keyword added');
      setAddOpen(false);
      setNewKeyword('');
    },
  });

  const queueMutation = useMutation({
    mutationFn: async () => {
      const toQueue = keywords?.filter(k => selected.includes(k.id)) || [];
      const inserts = toQueue.map(k => ({
        keyword_id: k.id,
        keyword_text: k.keyword,
        priority: k.search_volume || 0,
        status: 'queued',
        content_length: 'medium',
        tone: 'professional',
      }));
      const { error } = await supabase.from('autoblog_queue').insert(inserts as any);
      if (error) throw error;
      // Get max sort_priority to push selected keywords to the bottom
      const { data: maxRow } = await supabase.from('keyword_tracker').select('sort_priority').order('sort_priority', { ascending: false }).limit(1).single();
      const nextPriority = ((maxRow as any)?.sort_priority || 0) + 1;
      // Update keyword status and sort_priority
      await supabase.from('keyword_tracker').update({ content_status: 'queued', sort_priority: nextPriority } as any).in('id', selected);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-keywords'] });
      toast.success(`${selected.length} keywords queued for content generation`);
      setSelected([]);
    },
  });

  const statusColor = (status: string) => {
    if (status === 'published' || status === 'optimized') return 'default';
    if (status === 'queued' || status === 'draft') return 'secondary';
    return 'destructive';
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => prev.length === keywords?.length ? [] : keywords?.map(k => k.id) || []);

  return (
    <div className="space-y-6">
      {mrunsoxBanner}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Keyword Tracker</h1>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button onClick={() => queueMutation.mutate()} disabled={queueMutation.isPending}>
              <Wand2 className="w-4 h-4 mr-2" />Queue {selected.length} for AutoBlog
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 mr-2" />Add Keyword</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Keyword</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Keyword</Label><Input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} /></div>
                <div><Label>Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['primary', 'secondary', 'long-tail', 'local'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Search Volume</Label><Input type="number" value={newVolume} onChange={e => setNewVolume(e.target.value)} /></div>
                <div><Label>Difficulty</Label>
                  <Select value={newDifficulty} onValueChange={setNewDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Target Page</Label><Input value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="/services/..." /></div>
                <Button onClick={() => addMutation.mutate()} disabled={!newKeyword || addMutation.isPending} className="w-full">Add Keyword</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search keywords..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {['primary', 'secondary', 'long-tail', 'local'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selected.length === keywords?.length && keywords.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Target Page</TableHead>
              <TableHead>Content</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
            {keywords?.map(kw => (
              <TableRow key={kw.id}>
                <TableCell><Checkbox checked={selected.includes(kw.id)} onCheckedChange={() => toggleSelect(kw.id)} /></TableCell>
                <TableCell className="font-medium">{kw.keyword}</TableCell>
                <TableCell><Badge variant="outline">{kw.category}</Badge></TableCell>
                <TableCell>{kw.search_volume?.toLocaleString()}</TableCell>
                <TableCell><Badge variant={kw.difficulty === 'high' ? 'destructive' : kw.difficulty === 'medium' ? 'secondary' : 'outline'}>{kw.difficulty}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{kw.target_page}</TableCell>
                <TableCell><Badge variant={statusColor(kw.content_status) as any}>{kw.content_status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{keywords?.length || 0} keywords tracked</p>
    </div>
  );
}
