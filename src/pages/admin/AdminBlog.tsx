import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Eye, Pencil, Trash2, Wand2, Upload, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AutoBlogQueue } from '@/components/blog/AutoBlogQueue';
import { AutoBlogSettings } from '@/components/blog/AutoBlogSettings';
import { WordPressImporter } from '@/components/blog/WordPressImporter';

export default function AdminBlog() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [pathFilter, setPathFilter] = useState('all');
  const [enriching, setEnriching] = useState(false);
  const queryClient = useQueryClient();

  // Count un-enriched posts
  const { data: unenrichedCount } = useQuery({
    queryKey: ['unenriched-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .is('meta_title', null);
      if (error) throw error;
      return count || 0;
    },
  });

  const handleEnrich = async () => {
    setEnriching(true);
    toast.info(`Starting enrichment of ${unenrichedCount} posts... This may take several minutes.`);
    try {
      const res = await supabase.functions.invoke('enrich-blog-posts');
      if (res.error) throw res.error;
      const result = res.data;
      toast.success(`Enriched ${result.enriched} of ${result.total} posts!`);
      if (result.errors?.length > 0) {
        toast.warning(`${result.errors.length} posts had errors. Check console for details.`);
        console.error('Enrichment errors:', result.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['unenriched-count'] });
    } catch (err) {
      console.error('Enrichment failed:', err);
      toast.error('Enrichment failed. Check console for details.');
    } finally {
      setEnriching(false);
    }
  };

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts', statusFilter, sourceFilter, pathFilter],
    queryFn: async () => {
      let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
      if (pathFilter !== 'all') query = query.eq('primary_path', pathFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }); toast.success('Post deleted'); },
  });

  // Extract unique paths for filter dropdown
  const availablePaths = Array.from(new Set(
    (posts || []).map((p: any) => p.primary_path).filter(Boolean)
  )) as string[];

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { published: 'default', draft: 'secondary', archived: 'outline' };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Blog Manager</h1>
        <div className="flex gap-2">
          {unenrichedCount != null && unenrichedCount > 0 && (
            <Button variant="secondary" onClick={handleEnrich} disabled={enriching}>
              <Sparkles className="w-4 h-4 mr-2" />
              {enriching ? 'Enriching...' : `Enrich ${unenrichedCount} Posts`}
            </Button>
          )}
          <Button asChild><Link to="/admin/blog/editor"><Plus className="w-4 h-4 mr-2" />New Post</Link></Button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">📡 Mrunsox Integration:</strong> Posts with source "Mrunsox" are read-only mirrors from Kingdom OS. Legacy local posts remain fully editable.
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="autoblog">AutoBlog</TabsTrigger>
          <TabsTrigger value="import">WordPress Import</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="mrunsox">Mrunsox</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pathFilter} onValueChange={setPathFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Paths" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Paths</SelectItem>
                {availablePaths.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>}
                {posts?.map(post => {
                  const isMrunsox = (post as any).source === 'mrunsox';
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {post.ai_generated && <Badge variant="outline" className="mr-2 text-xs">AI</Badge>}
                        {post.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isMrunsox ? 'default' : 'secondary'} className="text-xs">
                          {isMrunsox ? 'Mrunsox' : 'Local'}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(post.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(post as any).primary_path || '—'}</TableCell>
                      <TableCell>{post.category}</TableCell>
                      <TableCell>{post.views}</TableCell>
                      <TableCell>{post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild><Link to={`/blog/${post.slug}`} target="_blank"><Eye className="w-4 h-4" /></Link></Button>
                        {!isMrunsox && (
                          <>
                            <Button variant="ghost" size="icon" asChild><Link to={`/admin/blog/editor/${post.id}`}><Pencil className="w-4 h-4" /></Link></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && (!posts || posts.length === 0) && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No posts yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="autoblog" className="space-y-6">
          <AutoBlogSettings />
          <AutoBlogQueue />
        </TabsContent>

        <TabsContent value="import">
          <WordPressImporter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
