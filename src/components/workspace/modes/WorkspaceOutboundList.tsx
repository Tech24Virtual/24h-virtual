import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';

export function WorkspaceOutboundList() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-3 h-9 flex items-center border-b shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outbound Calls</h3>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <OutboundCallQueue role="agent" />
      </div>
    </div>
  );
}
