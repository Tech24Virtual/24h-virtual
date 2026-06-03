import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Ticket,
  AlertTriangle,
  ListTodo,
  ClipboardCheck,
  PhoneOutgoing,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import type { SupervisorMode } from '@/hooks/useSupervisorWorkspaceMode';

interface Props {
  mode: SupervisorMode;
  onChange: (m: SupervisorMode) => void;
}

export function SupervisorWorkspaceModeTabs({ mode, onChange }: Props) {
  const { data: openEscalations = 0 } = useQuery({
    queryKey: ['sup-ws-open-escalations'],
    queryFn: async () => {
      const { count } = await supabase
        .from('supervisor_escalations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const isOverview = mode === 'overview';

  const tabs = [
    { id: 'tickets' as const, label: 'Tickets', icon: Ticket },
    { id: 'escalations' as const, label: 'Escalations', icon: AlertTriangle, badge: openEscalations },
    { id: 'tasks' as const, label: 'Tasks', icon: ListTodo },
    { id: 'reviews' as const, label: 'Reviews', icon: ClipboardCheck },
    { id: 'outbound' as const, label: 'Outbound', icon: PhoneOutgoing },
    { id: 'campaigns' as const, label: 'Campaigns', icon: Layers },
  ];

  return (
    <div className="h-9 shrink-0 flex items-center justify-between border-b bg-muted/30 px-1.5">
      <button
        onClick={() => onChange('overview')}
        className={cn(
          'flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-semibold transition-all',
          isOverview
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-foreground hover:bg-background',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isOverview ? 'bg-primary-foreground animate-pulse' : 'bg-primary animate-pulse',
          )}
        />
        <Activity className="h-3.5 w-3.5" />
        Overview
      </button>

      <div className="flex items-center gap-0.5">
        <div className="h-4 w-px bg-border mr-1" />
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 h-7 rounded text-[11px] transition-colors',
                active
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              {'badge' in t && t.badge && t.badge > 0 ? (
                <Badge
                  variant={active ? 'secondary' : 'destructive'}
                  className="h-3.5 px-1 text-[9px] ml-0.5"
                >
                  {t.badge > 99 ? '99+' : t.badge}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
