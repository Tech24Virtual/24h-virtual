import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { hrNavGroups, hrRoot } from '@/config/hrNav';

export function HRSidebar() {
  return (
    <DrilldownSidebar
      groups={hrNavGroups}
      rootPath={hrRoot}
      brandTag="HR Portal"
      roleLabel="HR Staff"
      backLink={{ label: 'Admin Dashboard', href: '/admin' }}
    />
  );
}
