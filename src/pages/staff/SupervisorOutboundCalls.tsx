import { PhoneOutgoing } from 'lucide-react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';

export default function SupervisorOutboundCalls() {
  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <PhoneOutgoing className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Outbound Call Queue</h1>
              <p className="text-muted-foreground mt-0.5">Oversee all outbound call requests</p>
            </div>
          </div>
        </div>
        <OutboundCallQueue role="supervisor" />
      </div>
    </StaffLayout>
  );
}
