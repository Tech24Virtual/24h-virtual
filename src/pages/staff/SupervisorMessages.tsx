import { StaffLayout } from '@/components/staff/StaffLayout';
import { SlackMessenger } from '@/components/admin/crm/SlackMessenger';

export default function SupervisorMessages() {
  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Team communication via Slack</p>
        </div>
        <SlackMessenger />
      </div>
    </StaffLayout>
  );
}
