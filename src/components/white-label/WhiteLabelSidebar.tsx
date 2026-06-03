import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { whiteLabelNavGroups, whiteLabelRoot } from '@/config/whiteLabelNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function WhiteLabelSidebar() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);
  const [portalSlug, setPortalSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('white_label_partners')
      .select('id, company_name, partner_slug')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: partner }) => {
        if (!partner) return;
        setCompanyName(partner.company_name ?? undefined);
        setPortalSlug(partner.partner_slug ?? undefined);
        supabase
          .from('white_label_branding')
          .select('logo_url')
          .eq('partner_id', partner.id)
          .maybeSingle()
          .then(({ data: b }) => setLogoUrl(b?.logo_url ?? undefined));
      });
  }, [user]);

  return (
    <DrilldownSidebar
      groups={whiteLabelNavGroups}
      rootPath={whiteLabelRoot}
      brandTag="Partner Portal"
      roleLabel="White Label Partner"
      logoSrc={logoUrl}
      logoAlt={companyName ?? 'Partner'}
      suppressDefaultLogo
      portalPreviewUrl={portalSlug ? `/portal/${portalSlug}` : undefined}
      logoBadge={
        <span className="text-xs font-medium text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
          Partner
        </span>
      }
    />
  );
}
