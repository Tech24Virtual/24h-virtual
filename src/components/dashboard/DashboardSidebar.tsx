import { useLocation } from 'react-router-dom';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { clientNavGroups, clientRoot } from '@/config/clientNav';

/**
 * Direct Client sidebar.
 * Admin viewing /admin/* still uses AdminSidebar; this only renders for client routes.
 */
export function DashboardSidebar() {
  const location = useLocation();
  // Defensive: if mounted under /admin via legacy paths, fall through gracefully.
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <DrilldownSidebar
      groups={clientNavGroups}
      rootPath={clientRoot}
      brandTag="Client Portal"
      roleLabel="Client"
    />
  );
}
