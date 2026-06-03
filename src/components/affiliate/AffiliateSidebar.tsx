import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { affiliateNavGroups, affiliateRoot } from '@/config/affiliateNav';

export function AffiliateSidebar() {
  return (
    <DrilldownSidebar
      groups={affiliateNavGroups}
      rootPath={affiliateRoot}
      brandTag="Affiliate Portal"
      roleLabel="Affiliate"
    />
  );
}
