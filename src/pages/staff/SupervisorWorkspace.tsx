import { SupervisorWorkspaceShell } from '@/components/workspace/supervisor/SupervisorWorkspaceShell';
import { SupervisorWorkspaceModeTabs } from '@/components/workspace/supervisor/SupervisorWorkspaceModeTabs';
import { OverviewMode } from '@/components/workspace/supervisor/modes/OverviewMode';
import { TicketsMode } from '@/components/workspace/supervisor/modes/TicketsMode';
import { EscalationsMode } from '@/components/workspace/supervisor/modes/EscalationsMode';
import { TasksMode } from '@/components/workspace/supervisor/modes/TasksMode';
import { ReviewsMode } from '@/components/workspace/supervisor/modes/ReviewsMode';
import { OutboundMode } from '@/components/workspace/supervisor/modes/OutboundMode';
import { CampaignsMode } from '@/components/workspace/supervisor/modes/CampaignsMode';
import { useSupervisorWorkspaceMode, type SupervisorMode } from '@/hooks/useSupervisorWorkspaceMode';
import { useState } from 'react';

export default function SupervisorWorkspace() {
  const { mode, setMode, sub, setSub, itemId, setItemId } = useSupervisorWorkspaceMode();
  const [ticketsFilter, setTicketsFilter] = useState<'all' | 'wl' | 'urgent' | 'unassigned'>('all');

  const jumpMode = (m: SupervisorMode, ref?: string) => {
    setMode(m);
    if (ref) setItemId(ref);
  };

  return (
    <SupervisorWorkspaceShell>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <SupervisorWorkspaceModeTabs mode={mode} onChange={setMode} />
        <div className="flex-1 flex overflow-hidden min-h-0">
          {mode === 'overview' && (
            <OverviewMode itemId={itemId} onSelect={setItemId} onJumpMode={jumpMode} />
          )}
          {mode === 'tickets' && (
            <TicketsMode
              itemId={itemId}
              onSelect={setItemId}
              filter={ticketsFilter}
              onFilterChange={setTicketsFilter}
            />
          )}
          {mode === 'escalations' && <EscalationsMode itemId={itemId} onSelect={setItemId} />}
          {mode === 'tasks' && <TasksMode itemId={itemId} onSelect={setItemId} />}
          {mode === 'reviews' && (
            <ReviewsMode sub={sub} onSubChange={setSub} itemId={itemId} onSelect={setItemId} />
          )}
          {mode === 'outbound' && <OutboundMode />}
          {mode === 'campaigns' && <CampaignsMode />}
        </div>
      </div>
    </SupervisorWorkspaceShell>
  );
}
