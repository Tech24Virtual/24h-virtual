import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WLPartnerBranding {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  portal_footer_text: string | null;
  powered_by_visible: boolean;
  font_heading: string | null;
  font_body: string | null;
  partner_company_name_fallback: string | null;
}

/**
 * Loads white_label_branding for a partner with partner table fallback for company_name.
 * Used by the dashboard exporter; the public viewer gets branding via the edge function.
 */
export function useWLPartnerBranding(partnerId: string | null | undefined) {
  return useQuery({
    queryKey: ['wl-partner-branding', partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const [brandingRes, partnerRes] = await Promise.all([
        supabase
          .from('white_label_branding')
          .select(
            'company_name, logo_url, primary_color, accent_color, support_email, support_phone, portal_footer_text, powered_by_visible, font_heading, font_body',
          )
          .eq('partner_id', partnerId!)
          .maybeSingle(),
        supabase
          .from('white_label_partners')
          .select('company_name')
          .eq('id', partnerId!)
          .maybeSingle(),
      ]);

      const branding = brandingRes.data;
      return {
        company_name: branding?.company_name ?? null,
        logo_url: branding?.logo_url ?? null,
        primary_color: branding?.primary_color ?? null,
        accent_color: branding?.accent_color ?? null,
        support_email: branding?.support_email ?? null,
        support_phone: branding?.support_phone ?? null,
        portal_footer_text: branding?.portal_footer_text ?? null,
        powered_by_visible: branding?.powered_by_visible ?? true,
        font_heading: branding?.font_heading ?? null,
        font_body: branding?.font_body ?? null,
        partner_company_name_fallback: partnerRes.data?.company_name ?? null,
      } as WLPartnerBranding;
    },
  });
}
