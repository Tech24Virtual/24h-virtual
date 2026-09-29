import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface PortalBranding {
  company_name: string | null;
  logo_url: string | null;
}

/**
 * WL portal visitors must never see 24H Virtual branding, even when bounced
 * here. Detects /portal/:slug in the URL and swaps in the partner's own
 * branding + a "Go Home" target back to their portal login instead of the
 * 24H marketing site.
 */
export default function Unauthorized() {
  const location = useLocation();
  const portalSlug = location.pathname.match(/^\/portal\/([^/]+)/)?.[1] ?? null;
  const [branding, setBranding] = useState<PortalBranding | null>(null);

  useEffect(() => {
    if (!portalSlug) return;
    const previousTitle = document.title;
    let cancelled = false;

    (async () => {
      const { data: partner } = await supabase
        .from('white_label_partners')
        .select('id')
        .eq('partner_slug', portalSlug)
        .maybeSingle();
      if (!partner || cancelled) return;

      const { data: brandingRow } = await supabase
        .from('white_label_branding')
        .select('company_name, logo_url')
        .eq('partner_id', partner.id)
        .maybeSingle();
      if (cancelled) return;

      setBranding(brandingRow);
      document.title = brandingRow?.company_name ? `Access Denied — ${brandingRow.company_name}` : 'Access Denied';
    })();

    return () => {
      cancelled = true;
      document.title = previousTitle;
    };
  }, [portalSlug]);

  const homeHref = portalSlug ? `/portal/${portalSlug}/login` : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {portalSlug && branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.company_name || 'Portal'}
              className="h-10 mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
          )}
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            If you believe this is an error, please contact your administrator or try logging in with a different account.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link to={homeHref}>
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button className="flex-1" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
