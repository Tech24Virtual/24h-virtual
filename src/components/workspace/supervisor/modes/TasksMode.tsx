import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getExpirationStatus } from '@/lib/taskPriority';
import { SupervisorContextDrawer, DrawerSection } from '../SupervisorContextDrawer';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { useMockableMutation } from '@/hooks/useMockableMutation';
import { MOCK_SUPERVISOR_TASKS } from '@/lib/mockData';

interface Props {
  itemId: string | null;
  onSelect: (id: string) => void;
}

const statusFilters = ['pending', 'in_progress', 'completed', 'all'] as const;
const prioFilters = ['all', 'urgent', 'high', 'medium', 'low'] as const;

const priorityTone: Record<string, string> = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export function TasksMode({ itemId, onSelect }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof statusFilters)[number]>('pending');
  const [prio, setPrio] = useState<(typeof prioFilters)[number]>('all');

  const { data: tasks = [], isLoading } = useMockableQuery({
    queryKey: ['sup-ws-tasks', status, prio],
    queryFn: async () => {
      let q = supabase
        .from('crm_tasks')
        .select('*, lead:leads(name, company)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(200);
      if (status !== 'all') q = q.eq('status', status);
      if (prio !== 'all') q = q.eq('priority', prio);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    mockData: () => {
      let rows = [...MOCK_SUPERVISOR_TASKS] as any[];
      if (status !== 'all') rows = rows.filter((t) => t.status === status);
      if (prio !== 'all') rows = rows.filter((t) => t.priority === prio);
      return rows;
    },
  });

  const selected = tasks.find((t) => t.id === itemId);

  // Auto-scroll selected task into view
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (itemId && itemRefs.current[itemId]) {
      itemRefs.current[itemId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [itemId, tasks.length]);

  const toggle = useMockableMutation({
    mutationFn: async (t: any) => {
      const newStatus = t.status === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('crm_tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', t.id);
      if (error) throw error;
    },
    mockToast: 'Mock mode — task status not persisted',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sup-ws-tasks'] });
      qc.invalidateQueries({ queryKey: ['sup-ws-overview-tasks'] });
      toast.success('Task updated');
    },
  });

  return (
    <>
      <aside className="w-44 shrink-0 h-full flex flex-col border-r bg-card overflow-hidden">
        <div className="h-9 px-3 flex items-center border-b shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filters
          </p>
        </div>
        <div className="p-2 space-y-3 overflow-y-auto">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Status
            </p>
            <div className="space-y-0.5">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'w-full text-left px-2 py-1 rounded text-xs capitalize transition-colors',
                    status === s
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-accent text-foreground',
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Priority
            </p>
            <div className="space-y-0.5">
              {prioFilters.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrio(p)}
                  className={cn(
                    'w-full text-left px-2 py-1 rounded text-xs capitalize transition-colors',
                    prio === p
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-accent text-foreground',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </h3>
          <span className="text-[10px] text-muted-foreground">{tasks.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && tasks.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No tasks</div>
            )}
            {tasks.map((t) => {
              const exp = getExpirationStatus(t.due_date, t.created_at, t.status);
              return (
                <button
                  key={t.id}
                  ref={(el) => (itemRefs.current[t.id] = el)}
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    'w-full text-left p-2 rounded-md border transition-colors',
                    itemId === t.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                    exp === 'expired' && 'border-l-2 border-l-destructive',
                    exp === 'warning' && 'border-l-2 border-l-orange-500',
                  )}
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border capitalize', priorityTone[t.priority])}>
                      {t.priority}
                    </span>
                    {exp === 'expired' && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    {exp === 'warning' && <Clock className="h-3 w-3 text-orange-500" />}
                  </div>
                  <p className={cn('text-xs font-medium line-clamp-2 leading-tight', t.status === 'completed' && 'line-through text-muted-foreground')}>
                    {t.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {t.lead?.name || 'No client'}
                    {t.due_date && ` · due ${formatDistanceToNow(new Date(t.due_date), { addSuffix: true })}`}
                  </p>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a task
          </div>
        ) : (
          <>
            <div className="h-12 px-4 border-b shrink-0 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">{selected.title}</h2>
                <p className="text-[10px] text-muted-foreground">
                  Created {format(new Date(selected.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <Button
                size="sm"
                variant={selected.status === 'completed' ? 'outline' : 'default'}
                onClick={() => toggle.mutate(selected)}
                disabled={toggle.isPending}
                className="gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selected.status === 'completed' ? 'Reopen' : 'Complete'}
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl text-sm">
                {selected.description && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="whitespace-pre-wrap">{selected.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Priority
                    </p>
                    <Badge variant="outline" className="capitalize">
                      {selected.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Status
                    </p>
                    <Badge variant="outline" className="capitalize">
                      {selected.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {selected.due_date && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Due
                      </p>
                      <p>{format(new Date(selected.due_date), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  )}
                  {selected.lead && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Client
                      </p>
                      <p>{selected.lead.name}{selected.lead.company && ` · ${selected.lead.company}`}</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <SupervisorContextDrawer title="Task">
        {selected ? (
          <>
            <DrawerSection title="Assigned to">
              <p className="font-mono text-[11px]">
                {selected.assigned_to ? `${selected.assigned_to.slice(0, 8)}…` : 'Unassigned'}
              </p>
            </DrawerSection>
            <DrawerSection title="Visibility">
              <Badge variant="outline" className="capitalize">
                {selected.visibility || 'self'}
              </Badge>
            </DrawerSection>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select a task to see metadata.</p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}
