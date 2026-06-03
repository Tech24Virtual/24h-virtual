import { TicketDetailView } from '@/components/tickets/TicketDetailView';
import { StaffLayout } from '@/components/staff/StaffLayout';

interface StaffTicketDetailProps {
  role: 'sales' | 'agent' | 'supervisor' | 'billing' | 'tech';
}

export default function StaffTicketDetail({ role }: StaffTicketDetailProps) {
  const backLinks: Record<string, string> = {
    sales: '/staff/sales/tickets',
    agent: '/staff/agent/tickets',
    supervisor: '/staff/supervisor/tickets',
    billing: '/staff/billing/tickets',
    tech: '/staff/tech/tickets',
  };

  return (
    <StaffLayout role={role}>
      <TicketDetailView backLink={backLinks[role]} canManage={true} />
    </StaffLayout>
  );
}
