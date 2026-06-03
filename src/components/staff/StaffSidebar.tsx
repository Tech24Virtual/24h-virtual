import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import {
  getStaffNav,
  getStaffRoot,
  STAFF_PORTAL_TITLES,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from '@/config/staffNav';
import { useActiveShiftTime } from '@/components/staff/ShiftClockWidget';

interface StaffSidebarProps {
  role: StaffRole;
}

export function StaffSidebar({ role }: StaffSidebarProps) {
  const groups = getStaffNav(role);
  const root = getStaffRoot(role);
  const activeShiftTime = useActiveShiftTime(role === 'agent');

  return (
    <DrilldownSidebar
      groups={groups}
      rootPath={root}
      brandTag={STAFF_PORTAL_TITLES[role]}
      roleLabel={STAFF_ROLE_LABELS[role]}
      renderGroupExtra={(group) => {
        if (role === 'agent' && group.name === 'Schedule' && activeShiftTime) {
          return (
            <span className="text-xs font-mono text-success">{activeShiftTime}</span>
          );
        }
        return null;
      }}
    />
  );
}
