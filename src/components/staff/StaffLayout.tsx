import { ReactNode } from 'react';
import { StaffSidebar } from './StaffSidebar';
import { StaffHeader } from './StaffHeader';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { type StaffRole } from '@/config/staffNav';

interface StaffLayoutProps {
  children: ReactNode;
  role: StaffRole;
}

export function StaffLayout({ children, role }: StaffLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <StaffSidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <StaffHeader role={role} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
    </div>
  );
}
