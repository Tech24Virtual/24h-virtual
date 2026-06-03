import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { WLPortalMobileNav } from './WLPortalMobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { wlClientUrl, wlLoginUrl } from '@/lib/wlClientUrl';

export function WLPortalHeader() {
  const { user, profile, signOut } = useAuth();
  const { slug, clientInfo, branding } = useWLPortal();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryColor = branding?.primary_color;

  const handleSignOut = async () => {
    await signOut();
    navigate(wlLoginUrl(slug));
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <WLPortalMobileNav onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: primaryColor ? `${primaryColor}1a` : undefined,
                  color: primaryColor || undefined,
                }}
              >
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {clientInfo?.contact_name || profile?.full_name || user?.email?.split('@')[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to={wlClientUrl(slug, 'settings')} className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
