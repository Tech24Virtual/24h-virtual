import { StaffLayout } from '@/components/staff/StaffLayout';
import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';

export default function SupervisorOutboundCalls() {
  return (
    <StaffLayout role="supervisor">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Outbound Call Queue</h1>
        <p className="text-muted-foreground">Oversee all outbound call requests</p>
      </div>
      <OutboundCallQueue role="supervisor" />
    </StaffLayout>
  );
}
