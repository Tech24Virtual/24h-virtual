import { TicketDetailView } from '@/components/tickets/TicketDetailView';

export default function AdminTicketDetail() {
  return <TicketDetailView backLink="/admin/tickets" canManage={true} />;
}
