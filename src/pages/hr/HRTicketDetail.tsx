import { TicketDetailView } from '@/components/tickets/TicketDetailView';
import { HRLayout } from '@/components/hr/HRLayout';

export default function HRTicketDetail() {
  return (
    <HRLayout>
      <TicketDetailView backLink="/hr-portal/tickets" canManage={true} />
    </HRLayout>
  );
}
