import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskDetailDialog } from '@/components/staff/TaskDetailDialog';
import { getExpirationStatus } from '@/lib/taskPriority';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function WorkspaceTaskList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['workspace-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, lead:leads(name, company)')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []).filter((t: any) =>
        t.visibility === 'self' ? t.created_by === user?.id || t.assigned_to === user?.id : true
      );
    },
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('crm_tasks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-tasks'] });
      toast.success('Task updated');
    },
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-3 h-9 flex items-center border-b shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Tasks</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{tasks?.length || 0}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 m-2" />)}
          {!isLoading && (!tasks || tasks.length === 0) && (
            <div className="text-center text-xs text-muted-foreground py-8">No tasks</div>
          )}
          {tasks?.map((t: any) => {
            const exp = getExpirationStatus(t.due_date, t.created_at, t.status);
            const done = t.status === 'completed';
            return (
              <div
                key={t.id}
                className={cn(
                  'p-2.5 flex items-start gap-2 hover:bg-accent/50 transition-colors cursor-pointer',
                  exp === 'expired' && 'bg-destructive/10 border-l-2 border-l-destructive',
                  exp === 'warning' && 'bg-yellow-500/10 border-l-2 border-l-yellow-500'
                )}
                onClick={() => { setSelected(t); setOpen(true); }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: t.id, status: done ? 'pending' : 'completed' }); }}
                  className="mt-0.5"
                >
                  {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cn('text-sm font-medium truncate', done && 'line-through text-muted-foreground')}>{t.title}</p>
                    {exp === 'expired' && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                  </div>
                  {t.lead && (
                    <p className="text-[11px] text-muted-foreground truncate">{t.lead.name}{t.lead.company && ` · ${t.lead.company}`}</p>
                  )}
                  {t.due_date && (
                    <p className={cn('text-[10px] mt-0.5', exp === 'expired' ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {format(new Date(t.due_date), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{t.priority}</Badge>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {selected && <TaskDetailDialog task={selected} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
