import { StaffLayout } from '@/components/staff/StaffLayout';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function AgentAppointments() {
  return (
    <StaffLayout role="agent">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Schedule and manage your client appointments</p>
        </div>
        <BookiiEmbed title="Appointments" />
      </div>
    </StaffLayout>
  );
}
