import { Outlet } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { adminPaletteEntries } from '@/config/adminNav';

export default function Admin() {
  return (
    <AdminLayout>
      <Outlet />
      <FeedbackWidget />
      <AdminDashboardSwitcher />
      <CommandPalette entries={adminPaletteEntries()} />
    </AdminLayout>
  );
}
