import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { DrilldownSidebar } from '@/components/navigation/DrilldownSidebar';
import { whiteLabelNavGroups, whiteLabelRoot } from '@/config/whiteLabelNav';
import { supabase } from '@/integrations/supabase/client';
import { useWLPartnerId } from '@/hooks/wl/useWLPartnerId';

export function WhiteLabelSidebar() {
  const { data: partnerId } = useWLPartnerId();
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);
  const [portalSlug, setPortalSlug] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) return;
    // Resolved via the canonical profiles.wl_partner_id (useWLPartnerId),
    // not a direct user_id match — works for any user tied to the partner.
    supabase
      .from('white_label_partners')
      .select('id, company_name, partner_slug')
      .eq('id', partnerId)
      .maybeSingle()
      .then(({ data: partner }) => {
        if (!partner) {
          setIsLoading(false);
          return;
        }
        setCompanyName(partner.company_name ?? undefined);
        setPortalSlug(partner.partner_slug ?? undefined);
        supabase
          .from('white_label_branding')
          .select('logo_url')
          .eq('partner_id', partner.id)
          .maybeSingle()
          .then(({ data: b }) => {
            setLogoUrl(b?.logo_url ?? undefined);
            setIsLoading(false);
          });
      });
  }, [partnerId]);

  return (
    <DrilldownSidebar
      groups={whiteLabelNavGroups}
      rootPath={whiteLabelRoot}
      brandTag="Partner Portal"
      roleLabel=""
      logoSrc={logoUrl}
      logoAlt={companyName ?? 'Partner'}
      suppressDefaultLogo
      logoLoading={isLoading}
      portalPreviewUrl={portalSlug ? `/portal/${portalSlug}` : undefined}
      logoBadge={
        <span className="text-xs font-medium text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
          Partner
        </span>
      }
    />
  );
}
