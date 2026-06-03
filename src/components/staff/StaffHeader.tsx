import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { HeaderShiftIndicator } from '@/components/staff/HeaderShiftIndicator';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface StaffHeaderProps {
  role: 'sales' | 'agent' | 'supervisor' | 'billing' | 'tech';
}

const roleTitles: Record<string, string> = {
  sales: 'Sales Dashboard',
  agent: 'Agent Dashboard',
  supervisor: 'Supervisor Dashboard',
  billing: 'Billing Dashboard',
  tech: 'Tech Support Dashboard',
};

export function StaffHeader({ role }: StaffHeaderProps) {
  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{roleTitles[role]}</h1>
      </div>

      <div className="flex items-center gap-2">
        {role === 'agent' && <HeaderShiftIndicator />}
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}