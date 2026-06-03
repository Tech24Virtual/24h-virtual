import { StaffLayout } from '@/components/staff/StaffLayout';
import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';

export default function AgentOutboundCalls() {
  return (
    <StaffLayout role="agent">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Outbound Call Queue</h1>
        <p className="text-muted-foreground">Manage outbound call requests from clients</p>
      </div>
      <OutboundCallQueue role="agent" />
    </StaffLayout>
  );
}
