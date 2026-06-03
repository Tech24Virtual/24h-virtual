import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';

export default function AdminOutboundCalls() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Outbound Call Requests</h1>
        <p className="text-muted-foreground">Full oversight of all outbound call requests</p>
      </div>
      <OutboundCallQueue role="admin" />
    </div>
  );
}
