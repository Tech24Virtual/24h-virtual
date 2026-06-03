import { StaffLayout } from '@/components/staff/StaffLayout';
import { SlackMessenger } from '@/components/admin/crm/SlackMessenger';
import { SlackMappingBanner } from '@/components/staff/SlackMappingBanner';

export default function AgentMessages() {
  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <SlackMappingBanner />
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Communicate with your team via Slack</p>
        </div>
        <SlackMessenger />
      </div>
    </StaffLayout>
  );
}
