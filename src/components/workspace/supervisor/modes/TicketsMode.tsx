import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceTicketDetail } from '@/components/workspace/modes/WorkspaceTicketDetail';
import { StaffAssignmentSelect } from '@/components/tickets/StaffAssignmentSelect';
import { SupervisorContextDrawer, DrawerSection } from '../SupervisorContextDrawer';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { useMockMode } from '@/hooks/useMockMode';
import { MOCK_SUPERVISOR_TICKETS } from '@/lib/mockData';

interface Props {
  itemId: string | null;
  onSelect: (id: string) => void;
  filter: 'all' | 'wl' | 'urgent' | 'unassigned';
  onFilterChange: (f: 'all' | 'wl' | 'urgent' | 'unassigned') => void;
}

const filters = [
  { id: 'all', label: 'Supervisor queue' },
  { id: 'urgent', label: 'Urgent / High' },
  { id: 'wl', label: 'WL Portal' },
  { id: 'unassigned', label: 'Unassigned' },
] as const;

export function TicketsMode({ itemId, onSelect, filter, onFilterChange }: Props) {
  const mockOn = useMockMode();
  useRealtimeTickets({ workQueueFilter: 'supervisor' });

  const { data: rows = [], isLoading } = useMockableQuery({
    queryKey: ['sup-ws-tickets', filter],
    queryFn: async () => {
      let q = supabase
        .from('support_tickets')
        .select('id, ticket_number, title, priority, status, assigned_to, source, created_at, last_activity_at')
        .eq('work_queue', 'supervisor')
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(150);
      if (filter === 'urgent') q = q.in('priority', ['urgent', 'high']);
      else if (filter === 'wl') q = q.eq('source', 'white_label_portal');
      else if (filter === 'unassigned') q = q.is('assigned_to', null);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    mockData: () => {
      let rows = MOCK_SUPERVISOR_TICKETS.map((t) => ({
        id: t.id,
        ticket_number: t.ticket_number,
        title: t.title,
        priority: t.priority,
        status: t.status,
        assigned_to: t.assigned_to,
        source: t.source,
        created_at: t.created_at,
        last_activity_at: t.last_activity_at,
      }));
      if (filter === 'urgent') rows = rows.filter((t) => ['urgent', 'high'].includes(t.priority));
      else if (filter === 'wl') rows = rows.filter((t) => t.source === 'white_label_portal');
      else if (filter === 'unassigned') rows = rows.filter((t) => !t.assigned_to);
      return rows;
    },
  });

  const selected = rows.find((r) => r.id === itemId);

  // Auto-scroll selected ticket into view when itemId changes (e.g., from Overview "Open in..." jump)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (itemId && itemRefs.current[itemId]) {
      itemRefs.current[itemId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [itemId, rows.length]);

  return (
    <>
      <aside className="w-44 shrink-0 h-full flex flex-col border-r bg-card overflow-hidden">
        <div className="h-9 px-3 flex items-center border-b shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filter
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                filter === f.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tickets
          </h3>
          <span className="text-[10px] text-muted-foreground">{rows.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && rows.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No tickets</div>
            )}
            {rows.map((t) => (
              <button
                key={t.id}
                ref={(el) => (itemRefs.current[t.id] = el)}
                onClick={() => onSelect(t.id)}
                className={cn(
                  'w-full text-left p-2 rounded-md border transition-colors',
                  itemId === t.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">#{t.ticket_number}</span>
                  <Badge variant="outline" className="text-[10px] capitalize h-4 px-1">
                    {t.status}
                  </Badge>
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

      <WorkspaceTicketDetail ticketId={itemId} />

      <SupervisorContextDrawer title="Ticket Context">
        {selected ? (
          <>
            <DrawerSection title="Identifiers">
              <p className="font-mono text-[11px]">#{selected.ticket_number}</p>
            </DrawerSection>
            <DrawerSection title="Source">
              <Badge variant="outline" className="capitalize">
                {selected.source?.replace(/_/g, ' ') || 'unknown'}
              </Badge>
            </DrawerSection>
            <DrawerSection title="Priority / Status">
              <div className="flex gap-1.5">
                <Badge variant="outline" className="capitalize">
                  {selected.priority}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selected.status}
                </Badge>
              </div>
            </DrawerSection>
            <DrawerSection title="Assignee">
              <StaffAssignmentSelect
                ticketId={selected.id}
                currentAssignee={selected.assigned_to}
                ticketNumber={selected.ticket_number as any}
                ticketTitle={selected.title}
              />
            </DrawerSection>
            <DrawerSection title="Open Full View">
              <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                <Link to={`/staff/supervisor/tickets/${selected.id}`}>
                  Full ticket page
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </DrawerSection>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select a ticket to see context and actions.</p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}
