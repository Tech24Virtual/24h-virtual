import { StaffLayout } from '@/components/staff/StaffLayout';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function AgentCalendar() {
  return (
    <StaffLayout role="agent">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">My Calendar</h1>
          <p className="text-muted-foreground">View and manage your schedule</p>
        </div>
        <BookiiEmbed title="Agent Calendar" />
      </div>
    </StaffLayout>
  );
}
