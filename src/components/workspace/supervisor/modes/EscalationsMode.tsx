import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2, ListTodo } from 'lucide-react';
import { SupervisorContextDrawer, DrawerSection } from '../SupervisorContextDrawer';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { useMockableMutation } from '@/hooks/useMockableMutation';
import { MOCK_ESCALATIONS } from '@/lib/mockData';

interface Props {
  itemId: string | null;
  onSelect: (id: string) => void;
}

const departments = ['all', 'hr', 'billing', 'sales', 'admin'] as const;
const statuses = ['open', 'resolved', 'all'] as const;

const priorityTone: Record<string, string> = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export function EscalationsMode({ itemId, onSelect }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dept, setDept] = useState<(typeof departments)[number]>('all');
  const [status, setStatus] = useState<(typeof statuses)[number]>('open');
  const [resolution, setResolution] = useState('');

  const { data: rows = [], isLoading } = useMockableQuery({
    queryKey: ['sup-ws-escalations', dept, status],
    queryFn: async () => {
      let q = supabase
        .from('supervisor_escalations')
        .select('*')
        .order('created_at', { ascending: false });
      if (dept !== 'all') q = q.eq('target_department', dept);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    mockData: () => {
      let rows = [...MOCK_ESCALATIONS] as any[];
      if (dept !== 'all') rows = rows.filter((r) => r.target_department === dept);
      if (status !== 'all') rows = rows.filter((r) => r.status === status);
      return rows;
    },
  });

  const selected = rows.find((r) => r.id === itemId);

  // Auto-scroll selected escalation into view
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (itemId && itemRefs.current[itemId]) {
      itemRefs.current[itemId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [itemId, rows.length]);

  const resolve = useMockableMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('supervisor_escalations')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution || null,
        })
        .eq('id', itemId!);
      if (error) throw error;
    },
    mockToast: 'Mock mode — escalation not actually resolved',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sup-ws-escalations'] });
      qc.invalidateQueries({ queryKey: ['sup-ws-open-escalations'] });
      qc.invalidateQueries({ queryKey: ['sup-ws-overview-escalations'] });
      setResolution('');
      toast.success('Escalation resolved');
    },
  });

  const createFollowupTask = useMockableMutation({
    mutationFn: async () => {
      if (!selected || !user) throw new Error('Missing context');
      const { error } = await supabase.from('crm_tasks').insert({
        title: `Follow up: ${selected.subject}`,
        description: `Auto-created from escalation (${selected.target_department}).\n\n${selected.description || ''}`,
        priority: selected.priority || 'medium',
        status: 'pending',
        created_by: user.id,
        assigned_to: user.id,
        visibility: 'universal',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
    },
    mockToast: 'Mock mode — follow-up task not persisted',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sup-ws-tasks'] });
      qc.invalidateQueries({ queryKey: ['sup-ws-overview-tasks'] });
      toast.success('Follow-up task created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create task'),
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
              {statuses.map((s) => (
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
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Department
            </p>
            <div className="space-y-0.5">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setDept(d)}
                  className={cn(
                    'w-full text-left px-2 py-1 rounded text-xs uppercase transition-colors',
                    dept === d
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-accent text-foreground',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Escalations
          </h3>
          <span className="text-[10px] text-muted-foreground">{rows.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && rows.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No escalations</div>
            )}
            {rows.map((e) => (
              <button
                key={e.id}
                ref={(el) => (itemRefs.current[e.id] = el)}
                onClick={() => onSelect(e.id)}
                className={cn(
                  'w-full text-left p-2 rounded-md border transition-colors',
                  itemId === e.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                )}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border capitalize', priorityTone[e.priority])}>
                    {e.priority}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize h-4 px-1">
                    {e.target_department}
                  </Badge>
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-tight">{e.subject}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  {e.status === 'resolved' && ' · resolved'}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select an escalation
          </div>
        ) : (
          <>
            <div className="h-12 px-4 border-b shrink-0 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">{selected.subject}</h2>
                <p className="text-[10px] text-muted-foreground">
                  Created {format(new Date(selected.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="capitalize">
                  {selected.priority}
                </Badge>
                <Badge variant={selected.status === 'open' ? 'default' : 'secondary'} className="capitalize">
                  {selected.status}
                </Badge>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Target
                  </p>
                  <Badge variant="outline" className="uppercase">
                    {selected.target_department}
                  </Badge>
                </div>
                {selected.description && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                  </div>
                )}
                {selected.resolution_notes && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Resolution
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{selected.resolution_notes}</p>
                  </div>
                )}
                {selected.status !== 'resolved' && (
                  <div className="space-y-2 pt-3 border-t">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resolve
                    </p>
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Resolution notes..."
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => resolve.mutate()}
                      disabled={resolve.isPending}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Resolved
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <SupervisorContextDrawer title="Escalation">
        {selected ? (
          <>
            <DrawerSection title="Created by">
              <p className="font-mono text-[11px]">{selected.supervisor_id?.slice(0, 8)}…</p>
            </DrawerSection>
            {selected.related_agent_id && (
              <DrawerSection title="Related agent">
                <p className="font-mono text-[11px]">{selected.related_agent_id.slice(0, 8)}…</p>
              </DrawerSection>
            )}
            {selected.related_client_id && (
              <DrawerSection title="Related client">
                <p className="font-mono text-[11px]">{selected.related_client_id.slice(0, 8)}…</p>
              </DrawerSection>
            )}
            <DrawerSection title="Quick Actions">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-1.5"
                onClick={() => createFollowupTask.mutate()}
                disabled={createFollowupTask.isPending}
              >
                <ListTodo className="h-3.5 w-3.5" />
                Create follow-up task
              </Button>
            </DrawerSection>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select an escalation to see related context.</p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}
