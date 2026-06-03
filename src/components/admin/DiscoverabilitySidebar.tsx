import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Search,
  Users,
  HelpCircle,
  Link2,
  FileStack,
  Send,
  ShieldCheck,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  name: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
}

const items: Item[] = [
  { name: "Overview", href: "/admin/discoverability", icon: LayoutDashboard, end: true },
  { name: "Templates", href: "/admin/discoverability/templates", icon: FileText },
  { name: "Locations", href: "/admin/discoverability/locations", icon: MapPin },
  { name: "Keywords", href: "/admin/discoverability/keywords", icon: Search },
  { name: "Audiences", href: "/admin/discoverability/audiences", icon: Users },
  { name: "FAQ Library", href: "/admin/discoverability/faqs", icon: HelpCircle },
  { name: "Internal Links", href: "/admin/discoverability/links", icon: Link2 },
  { name: "Generated Pages", href: "/admin/discoverability/pages", icon: FileStack },
  { name: "Publish Queue", href: "/admin/discoverability/queue", icon: Send },
  { name: "Quality Review", href: "/admin/discoverability/review", icon: ShieldCheck },
  { name: "Sitemap Controls", href: "/admin/discoverability/sitemap", icon: MapIcon },
];

/**
 * Sub-tab bar for the Discoverability Engine.
 *
 * Wrapping pill grid so all 11 sections are visible at any viewport
 * without horizontal scrolling. Export name preserved so route wiring
 * stays untouched.
 */
export function DiscoverabilitySidebar() {
  const location = useLocation();

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Discoverability Engine
        </p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {items.length} sections
        </p>
      </div>
      <nav aria-label="Discoverability sections" className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = item.end
            ? location.pathname === item.href
            : location.pathname === item.href ||
              location.pathname.startsWith(item.href + "/");
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
