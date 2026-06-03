import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { adminNavGroups, findActiveGroup, type AdminNavGroup, type AdminNavTab } from '@/config/adminNav';
import { UtilityTray } from '@/components/navigation/UtilityTray';
import logoBlue from '@/assets/logos/logo-blue.png';

interface AdminMobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileNav({ open, onClose }: AdminMobileNavProps) {
  const location = useLocation();
  const activeGroup = findActiveGroup(location.pathname);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const renderTab = (tab: AdminNavTab) => (
    <Link
      key={tab.href}
      to={tab.href}
      onClick={onClose}
      className={cn(
        'block px-3 py-2 rounded-md text-sm transition-colors',
        isActive(tab.href)
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {tab.name}
    </Link>
  );

  const renderGroup = (group: AdminNavGroup) => {
    // Overview / single-destination groups
    const isFlat = !group.tabs?.length && !group.tabClusters?.length && !group.systemItems?.length;
    if (isFlat && group.href) {
      return (
        <Link
          key={group.name}
          to={group.href}
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
            isActive(group.href)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <group.icon className="w-5 h-5" />
          {group.name}
        </Link>
      );
    }

    return (
      <AccordionItem key={group.name} value={group.name} className="border-b-0">
        <AccordionTrigger
          className={cn(
            'px-4 py-3 rounded-lg text-sm font-medium hover:no-underline hover:bg-accent',
            activeGroup?.name === group.name && 'text-primary'
          )}
        >
          <span className="flex items-center gap-3">
            <group.icon className="w-5 h-5" />
            {group.name}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-1">
          <div className="ml-4 pl-4 border-l space-y-1">
            {group.tabs?.map(renderTab)}
            {group.tabClusters?.map((cluster) => (
              <div key={cluster.name} className="pt-2">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {cluster.name}
                </div>
                {cluster.tabs.map(renderTab)}
              </div>
            ))}
            {group.systemItems?.map((item) =>
              renderTab({ name: item.name, href: item.href })
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>
            <img src={logoBlue} alt="24H Virtual" className="h-8" />
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-auto p-2">
          <Accordion
            type="single"
            collapsible
            defaultValue={activeGroup?.name}
            className="w-full"
          >
            {adminNavGroups.map(renderGroup)}
          </Accordion>
        </nav>

        <UtilityTray roleLabel="Admin" />
      </SheetContent>
    </Sheet>
  );
}
