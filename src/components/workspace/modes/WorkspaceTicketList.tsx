import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: 'mine' | 'all' | 'unassigned';
}

export function WorkspaceTicketList({ selectedId, onSelect, filter }: Props) {
  const { user } = useAuth();
  useRealtimeTickets();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['workspace-tickets', filter, user?.id],
    queryFn: async () => {
      let q = supabase
        .from('support_tickets')
        .select('id, ticket_number, title, priority, status, assigned_to, created_at, last_activity_at')
        .eq('work_queue', 'agent')
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (filter === 'mine') q = q.eq('assigned_to', user!.id);
      else if (filter === 'unassigned') q = q.is('assigned_to', null);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
      <div className="px-3 h-9 flex items-center justify-between border-b shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tickets</h3>
        <span className="text-[10px] text-muted-foreground">{rows?.length || 0}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-1">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          {!isLoading && rows?.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">No tickets</div>
          )}
          {rows?.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                'w-full text-left p-2 rounded-md border transition-colors',
                selectedId === t.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">#{t.ticket_number}</span>
                <Badge variant="outline" className="text-[10px] capitalize h-4 px-1">{t.status}</Badge>
              </div>
              <p className="text-xs font-medium line-clamp-2 leading-tight">{t.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1 capitalize">
                {t.priority} · {formatDistanceToNow(new Date(t.last_activity_at || t.created_at), { addSuffix: true })}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
