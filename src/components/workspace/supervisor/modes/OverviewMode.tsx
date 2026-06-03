import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Ticket,
  Clock,
  UserPlus,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ActiveShiftsWidget } from '@/components/staff/ActiveShiftsWidget';
import { OverdueFollowupsWidget } from '@/components/admin/crm/OverdueFollowupsWidget';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { SupervisorContextDrawer, DrawerSection } from '../SupervisorContextDrawer';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { useMockMode } from '@/hooks/useMockMode';
import {
  MOCK_ESCALATIONS,
  MOCK_SUPERVISOR_TICKETS,
  MOCK_SUPERVISOR_TASKS,
  MOCK_UNASSIGNED_CLIENTS,
} from '@/lib/mockData';
import type { SupervisorMode } from '@/hooks/useSupervisorWorkspaceMode';

interface Props {
  itemId: string | null;
  onSelect: (id: string) => void;
  onJumpMode: (m: SupervisorMode, itemId?: string) => void;
}

type FeedItem = {
  id: string;
  kind: 'escalation' | 'ticket' | 'task' | 'assignment';
  severity: 'critical' | 'high' | 'normal';
  title: string;
  subtitle: string;
  age: string;
  jumpMode: SupervisorMode;
  refId?: string;
};

export function OverviewMode({ itemId, onSelect, onJumpMode }: Props) {
  const mockOn = useMockMode();
  useRealtimeTickets({ workQueueFilter: 'supervisor' });

  // Open escalations
  const { data: escalations = [] } = useMockableQuery({
    queryKey: ['sup-ws-overview-escalations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('supervisor_escalations')
        .select('id, subject, target_department, priority, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: mockOn ? false : 30000,
    mockData: () =>
      MOCK_ESCALATIONS.filter((e) => e.status === 'open').map((e) => ({
        id: e.id,
        subject: e.subject,
        target_department: e.target_department,
        priority: e.priority,
        created_at: e.created_at,
      })),
  });

  // Urgent supervisor tickets
  const { data: tickets = [] } = useMockableQuery({
    queryKey: ['sup-ws-overview-tickets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, priority, status, created_at, last_activity_at')
        .eq('work_queue', 'supervisor')
        .in('status', ['open', 'in_progress', 'waiting'])
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: mockOn ? false : 30000,
    mockData: () =>
      MOCK_SUPERVISOR_TICKETS.filter((t) =>
        ['open', 'in_progress', 'waiting'].includes(t.status),
      ).map((t) => ({
        id: t.id,
        ticket_number: t.ticket_number,
        title: t.title,
        priority: t.priority,
        status: t.status,
        created_at: t.created_at,
        last_activity_at: t.last_activity_at,
      })),
  });

  // Overdue tasks
  const { data: tasks = [] } = useMockableQuery({
    queryKey: ['sup-ws-overview-tasks'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('crm_tasks')
        .select('id, title, priority, due_date, status')
        .eq('status', 'pending')
        .not('due_date', 'is', null)
        .lt('due_date', nowIso)
        .order('due_date', { ascending: true })
        .limit(15);
      return data || [];
    },
    refetchInterval: mockOn ? false : 60000,
    mockData: () => {
      const now = Date.now();
      return MOCK_SUPERVISOR_TASKS.filter(
        (t) => t.status === 'pending' && t.due_date && new Date(t.due_date).getTime() < now,
      ).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
        status: t.status,
      }));
    },
  });

  // Clients needing assignment
  const { data: unassignedClients = [] } = useMockableQuery({
    queryKey: ['sup-ws-overview-unassigned'],
    queryFn: async () => {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, company, pipeline_stage, created_at')
        .in('pipeline_stage', ['active', 'onboarding'])
        .limit(50);
      const ids = (leads || []).map((l) => l.id);
      if (ids.length === 0) return [];
      const { data: assigned } = await supabase
        .from('client_agent_assignments')
        .select('client_id')
        .in('client_id', ids);
      const assignedSet = new Set((assigned || []).map((a) => a.client_id));
      return (leads || []).filter((l) => !assignedSet.has(l.id)).slice(0, 10);
    },
    refetchInterval: mockOn ? false : 60000,
    mockData: () => MOCK_UNASSIGNED_CLIENTS.slice(0, 10),
  });

  // Build prioritized feed
  const feed: FeedItem[] = [
    ...escalations.map((e): FeedItem => ({
      id: `esc-${e.id}`,
      kind: 'escalation',
      severity: e.priority === 'urgent' ? 'critical' : e.priority === 'high' ? 'high' : 'normal',
      title: e.subject,
      subtitle: `Escalation · ${e.target_department}`,
      age: formatDistanceToNow(new Date(e.created_at), { addSuffix: true }),
      jumpMode: 'escalations',
      refId: e.id,
    })),
    ...tickets
      .filter((t) => t.priority === 'urgent' || t.priority === 'high')
      .map((t): FeedItem => ({
        id: `tic-${t.id}`,
        kind: 'ticket',
        severity: t.priority === 'urgent' ? 'critical' : 'high',
        title: t.title,
        subtitle: `Ticket #${t.ticket_number} · ${t.status}`,
        age: formatDistanceToNow(new Date(t.last_activity_at || t.created_at), { addSuffix: true }),
        jumpMode: 'tickets',
        refId: t.id,
      })),
    ...tasks.map((t): FeedItem => ({
      id: `tsk-${t.id}`,
      kind: 'task',
      severity: t.priority === 'urgent' ? 'critical' : 'high',
      title: t.title,
      subtitle: `Overdue task · ${t.priority}`,
      age: t.due_date ? formatDistanceToNow(new Date(t.due_date), { addSuffix: true }) : '—',
      jumpMode: 'tasks',
      refId: t.id,
    })),
    ...unassignedClients.map((c): FeedItem => ({
      id: `asn-${c.id}`,
      kind: 'assignment',
      severity: 'normal',
      title: c.name || 'Unnamed client',
      subtitle: `Needs assignment · ${c.pipeline_stage}`,
      age: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
      jumpMode: 'overview',
      refId: c.id,
    })),
  ].sort((a, b) => {
    const order = { critical: 0, high: 1, normal: 2 };
    return order[a.severity] - order[b.severity];
  });

  const selected = feed.find((f) => f.id === itemId);

  return (
    <>
      {/* Filter rail (compact, signal-only) */}
      <aside className="w-44 shrink-0 h-full flex flex-col border-r bg-card overflow-hidden">
        <div className="h-9 px-3 flex items-center border-b shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Signals
          </p>
        </div>
        <div className="p-2 space-y-1.5 text-[11px]">
          <SignalRow icon={AlertTriangle} label="Escalations" value={escalations.length} tone="destructive" />
          <SignalRow icon={Ticket} label="Urgent tickets" value={tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length} tone="warning" />
          <SignalRow icon={Clock} label="Overdue tasks" value={tasks.length} tone="warning" />
          <SignalRow icon={UserPlus} label="Unassigned" value={unassignedClients.length} tone="muted" />
        </div>
      </aside>

      {/* Action feed */}
      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Action Feed
          </h3>
          <span className="text-[10px] text-muted-foreground">{feed.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {feed.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                All clear — no pressing items.
              </div>
            )}
            {feed.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded-md border transition-colors flex items-start gap-2',
                  itemId === f.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                )}
              >
                <span
                  className={cn(
                    'mt-1 h-2 w-2 rounded-full shrink-0',
                    f.severity === 'critical' && 'bg-destructive animate-pulse',
                    f.severity === 'high' && 'bg-orange-500',
                    f.severity === 'normal' && 'bg-muted-foreground/40',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium line-clamp-1">{f.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{f.subtitle}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">{f.age}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Live ops grid */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-9 px-3 flex items-center border-b shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Operations
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-min">
            <ActiveShiftsWidget />
            <OverdueFollowupsWidget />
            <CountTile
              icon={AlertTriangle}
              label="Open Escalations"
              count={escalations.length}
              tone="destructive"
              top={escalations.slice(0, 3).map((e) => e.subject)}
              onJump={() => onJumpMode('escalations')}
            />
            <CountTile
              icon={Ticket}
              label="Supervisor Queue"
              count={tickets.length}
              tone="warning"
              top={tickets.slice(0, 3).map((t) => t.title)}
              onJump={() => onJumpMode('tickets')}
            />
            <CountTile
              icon={UserPlus}
              label="Clients Need Assignment"
              count={unassignedClients.length}
              tone="muted"
              top={unassignedClients.slice(0, 3).map((c) => c.name || 'Unnamed')}
              href="/staff/supervisor/client-assignments"
            />
            <CountTile
              icon={Clock}
              label="Overdue Tasks"
              count={tasks.length}
              tone="warning"
              top={tasks.slice(0, 3).map((t) => t.title)}
              onJump={() => onJumpMode('tasks')}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Context drawer */}
      <SupervisorContextDrawer title={selected ? 'Selected Item' : 'Overview'}>
        {selected ? (
          <>
            <DrawerSection title="Item">
              <p className="font-medium">{selected.title}</p>
              <p className="text-muted-foreground mt-0.5">{selected.subtitle}</p>
              <p className="text-muted-foreground/80 mt-0.5">{selected.age}</p>
            </DrawerSection>
            <DrawerSection title="Severity">
              <Badge
                variant={
                  selected.severity === 'critical'
                    ? 'destructive'
                    : selected.severity === 'high'
                      ? 'default'
                      : 'secondary'
                }
                className="capitalize"
              >
                {selected.severity}
              </Badge>
            </DrawerSection>
            <DrawerSection title="Quick Actions">
              {selected.kind === 'assignment' ? (
                <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                  <Link to="/staff/supervisor/client-assignments" target="_blank" rel="noopener noreferrer">
                    Open Client Assignments
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              ) : (
                <button
                  onClick={() => onJumpMode(selected.jumpMode, selected.refId)}
                  className="w-full text-left px-2 py-1.5 rounded border hover:bg-accent text-xs flex items-center justify-between"
                >
                  Open in {selected.jumpMode}
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </DrawerSection>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select an action-feed item to see details and jump into the relevant queue.
          </p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: 'destructive' | 'warning' | 'muted';
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-background">
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            'h-3 w-3',
            tone === 'destructive' && 'text-destructive',
            tone === 'warning' && 'text-orange-500',
            tone === 'muted' && 'text-muted-foreground',
          )}
        />
        <span>{label}</span>
      </div>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

function CountTile({
  icon: Icon,
  label,
  count,
  tone,
  top,
  onJump,
  href,
}: {
  icon: any;
  label: string;
  count: number;
  tone: 'destructive' | 'warning' | 'muted';
  top: string[];
  onJump?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            'h-4 w-4',
            tone === 'destructive' && 'text-destructive',
            tone === 'warning' && 'text-orange-500',
            tone === 'muted' && 'text-muted-foreground',
          )}
        />
      </div>
      <p
        className={cn(
          'text-3xl font-bold leading-none',
          tone === 'destructive' && count > 0 && 'text-destructive',
        )}
      >
        {count}
      </p>
      {top.length > 0 && (
        <ul className="space-y-0.5 mt-auto">
          {top.map((t, i) => (
            <li key={i} className="text-[11px] text-muted-foreground truncate">
              · {t}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const cls = 'text-left border rounded-md p-3 bg-card hover:bg-accent/40 transition-colors flex flex-col gap-2 min-h-[140px]';

  if (href) {
    return (
      <Link to={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onJump} className={cls}>
      {inner}
    </button>
  );
}
