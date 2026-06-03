import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';

export function OutboundMode() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div className="h-9 px-3 flex items-center border-b shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Outbound Call Queue
        </p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <OutboundCallQueue role="supervisor" />
      </div>
    </div>
  );
}
