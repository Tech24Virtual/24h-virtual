import { Outlet, NavLink } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const primaryNav = [
  { to: '/admin/campaign-os', label: 'Overview', end: true },
  { to: '/admin/campaign-os/campaigns', label: 'Campaigns' },
  { to: '/admin/campaign-os/reporting', label: 'Reporting' },
  { to: '/admin/campaign-os/five9', label: 'Five9' },
];

const libraryNav = [
  { to: '/admin/campaign-os/departments', label: 'Departments' },
  { to: '/admin/campaign-os/fields', label: 'Fields' },
  { to: '/admin/campaign-os/faqs', label: 'FAQs' },
  { to: '/admin/campaign-os/policies', label: 'Policies' },
  { to: '/admin/campaign-os/defaults', label: 'Defaults' },
  { to: '/admin/campaign-os/drafts', label: 'Drafts' },
  { to: '/admin/campaign-os/templates', label: 'Templates' },
];

const tenantsNav = [
  { to: '/admin/campaign-os/clients', label: 'Active Accounts' },
  { to: '/admin/campaign-os/locations', label: 'Locations' },
  { to: '/admin/campaign-os/call-flows', label: 'Call Flows' },
];

export default function CampaignOsLayout() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clients, locations, and call flows. Each call flow gets one campaign with its own script, fields, and Five9 mapping.
          </p>
        </div>
        <nav className="space-y-2 border-b pb-2">
          {/* Primary row: preserves the original styling exactly */}
          <div className="flex flex-wrap gap-2">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          {/* Secondary row: grouped Library + Tenants. Smaller chips, same active/hover semantics. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mr-1">
                Library
              </span>
              {libraryNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-2.5 py-1 text-xs rounded-md transition-colors ${
                      isActive ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mr-1">
                Tenants
              </span>
              {tenantsNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-2.5 py-1 text-xs rounded-md transition-colors ${
                      isActive ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        <Outlet />
      </div>
    </ProtectedRoute>
  );
}
