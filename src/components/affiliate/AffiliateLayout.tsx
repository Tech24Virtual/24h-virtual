import { ReactNode } from 'react';
import { AffiliateSidebar } from './AffiliateSidebar';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AffiliateLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AffiliateLayout({ children, title = 'Affiliate Dashboard' }: AffiliateLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <AffiliateSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
    </div>
  );
}
