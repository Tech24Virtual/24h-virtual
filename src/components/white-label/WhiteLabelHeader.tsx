import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { WhiteLabelSidebar } from './WhiteLabelSidebar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function WhiteLabelHeader() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('white_label_partners')
      .select('id, company_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: partner }) => {
        if (!partner) {
          setIsLoading(false);
          return;
        }
        setCompanyName(partner.company_name ?? null);
        supabase
          .from('white_label_branding')
          .select('logo_url')
          .eq('partner_id', partner.id)
          .maybeSingle()
          .then(({ data: b }) => {
            setLogoUrl(b?.logo_url ?? null);
            setIsLoading(false);
          });
      });
  }, [user]);

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Mobile menu button */}
        <div className="flex items-center gap-4 lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <WhiteLabelSidebar />
            </SheetContent>
          </Sheet>
          {isLoading ? (
            <Skeleton className="h-7 w-[100px] rounded" />
          ) : (
            <Link to="/white-label-dashboard">
              {logoUrl
                ? <img src={logoUrl} alt={companyName ?? 'Partner Dashboard'} className="h-7 object-contain" />
                : <span className="text-sm font-semibold">{companyName ?? 'Partner Dashboard'}</span>
              }
            </Link>
          )}
        </div>

        {/* Desktop title */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-heading">Partner Dashboard</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
