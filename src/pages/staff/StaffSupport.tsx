import { StaffLayout } from '@/components/staff/StaffLayout';
import { PiPAssistant } from '@/components/pip/PiPAssistant';

interface StaffSupportProps {
  role: 'sales' | 'agent' | 'supervisor' | 'billing' | 'tech';
}

export default function StaffSupport({ role }: StaffSupportProps) {
  return (
    <StaffLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">PiP Assistant</h1>
          <p className="text-muted-foreground mt-1">Your AI-powered guide to your dashboard</p>
        </div>
        <PiPAssistant dashboardContext={role} />
      </div>
    </StaffLayout>
  );
}
