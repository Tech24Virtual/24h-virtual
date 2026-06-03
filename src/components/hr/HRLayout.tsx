import { ReactNode } from 'react';
import { HRSidebar } from './HRSidebar';
import { HRHeader } from './HRHeader';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';

interface HRLayoutProps {
  children: ReactNode;
}

export function HRLayout({ children }: HRLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <HRSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <HRHeader />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
    </div>
  );
}
