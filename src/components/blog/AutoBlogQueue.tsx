import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wand2, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function AutoBlogQueue() {
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery({
    queryKey: ['autoblog-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autoblog_queue')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (item: { id: string; keyword_text: string; content_length: string; tone: string; angle?: string }) => {
      // Update status to generating
      await supabase.from('autoblog_queue').update({ status: 'generating' } as any).eq('id', item.id);

      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: {
          keyword: item.keyword_text,
          content_length: item.content_length,
          tone: item.tone,
          angle: item.angle,
          queue_id: item.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoblog-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Blog post generated!');
    },
    onError: (e: Error) => toast.error(`Generation failed: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('autoblog_queue').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoblog-queue'] });
      toast.success('Removed from queue');
    },
  });

  const batchMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('autoblog-batch', {
        body: { count: 2 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['autoblog-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(`Batch complete: ${data?.generated || 0} posts generated`);
    },
    onError: (e: Error) => toast.error(`Batch failed: ${e.message}`),
  });

  const queuedCount = queue?.filter(q => q.status === 'queued').length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Generation Queue</h3>
        {queuedCount > 0 && (
          <Button onClick={() => batchMutation.mutate()} disabled={batchMutation.isPending}>
            <Wand2 className="w-4 h-4 mr-2" />
            {batchMutation.isPending ? 'Generating...' : `Generate Batch (${queuedCount} queued)`}
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Length</TableHead>
              <TableHead>Tone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>}
            {queue?.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.keyword_text}</TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell><Badge variant="outline">{item.content_length}</Badge></TableCell>
                <TableCell>{item.tone}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'generated' ? 'default' : item.status === 'failed' ? 'destructive' : item.status === 'generating' ? 'secondary' : 'outline'}>
                    {item.status}
                  </Badge>
                  {item.error_message && <p className="text-xs text-destructive mt-1 max-w-xs truncate">{item.error_message}</p>}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {item.status === 'queued' && (
                    <Button variant="ghost" size="icon" onClick={() => generateMutation.mutate(item)} disabled={generateMutation.isPending}>
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (!queue || queue.length === 0) && (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Queue is empty. Add keywords from the Keywords page.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
