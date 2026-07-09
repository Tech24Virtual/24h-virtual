import { MessageSquare } from 'lucide-react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { SlackMessenger } from '@/components/admin/crm/SlackMessenger';
import { SlackMappingBanner } from '@/components/staff/SlackMappingBanner';

export default function AgentMessages() {
  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Messages</h1>
              <p className="text-muted-foreground mt-0.5">Communicate with your team via Slack</p>
            </div>
          </div>
        </div>
        <SlackMappingBanner />
        <SlackMessenger />
      </div>
    </StaffLayout>
  );
}
