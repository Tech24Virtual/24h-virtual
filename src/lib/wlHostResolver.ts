import { supabase } from '@/integrations/supabase/client';

const TWENTY_FOUR_H_HOSTS = [
  'lovable.app',
  '24hv.io',
  'www.24hv.io',
  'localhost',
];

export interface WLHostResolution {
  isPartnerHostname: boolean;
  partnerId: string | null;
  partnerSlug: string | null;
  canonicalHostname: string | null;
  isAlias: boolean;
  branding: WLHostBranding | null;
}

export interface WLHostBranding {
  id: string;
  partner_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  company_name: string | null;
  favicon_url: string | null;
  support_email: string | null;
  support_phone: string | null;
  login_page_title: string | null;
  welcome_message: string | null;
  sidebar_style: string | null;
  font_heading: string | null;
  font_body: string | null;
  portal_footer_text: string | null;
  powered_by_visible: boolean | null;
  custom_domain: string | null;
}

/** Check if hostname belongs to a 24H / development host */
export function is24HHost(hostname: string): boolean {
  if (TWENTY_FOUR_H_HOSTS.includes(hostname)) return true;
  // *.lovable.app subdomains
  if (hostname.endsWith('.lovable.app')) return true;
  // local dev with ports
  if (hostname === '127.0.0.1') return true;
  return false;
}

const NOT_PARTNER: WLHostResolution = {
  isPartnerHostname: false,
  partnerId: null,
  partnerSlug: null,
  canonicalHostname: null,
  isAlias: false,
  branding: null,
};

async function fetchPartnerSlug(partnerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('white_label_partners')
    .select('partner_slug')
    .eq('id', partnerId)
    .maybeSingle();
  return (data as any)?.partner_slug || null;
}

/** Resolve a hostname to a WL partner. Returns fast for 24H hosts. */
export async function resolveHostname(hostname: string): Promise<WLHostResolution> {
  if (is24HHost(hostname)) return NOT_PARTNER;

  // 1. Check canonical custom_domain in branding
  const { data: brandingRow } = await supabase
    .from('white_label_branding')
    .select('*')
    .eq('custom_domain', hostname)
    .maybeSingle();

  if (brandingRow) {
    const partnerSlug = await fetchPartnerSlug(brandingRow.partner_id);
    return {
      isPartnerHostname: true,
      partnerId: brandingRow.partner_id,
      partnerSlug,
      canonicalHostname: hostname,
      isAlias: false,
      branding: brandingRow as unknown as WLHostBranding,
    };
  }

  // 2. Check alias table
  const { data: aliasRow } = await supabase
    .from('white_label_domain_aliases')
    .select('partner_id, alias_hostname')
    .eq('alias_hostname', hostname)
    .maybeSingle();

  if (aliasRow) {
    const { data: partnerBranding } = await supabase
      .from('white_label_branding')
      .select('*')
      .eq('partner_id', aliasRow.partner_id)
      .maybeSingle();

    const partnerSlug = await fetchPartnerSlug(aliasRow.partner_id);

    return {
      isPartnerHostname: true,
      partnerId: aliasRow.partner_id,
      partnerSlug,
      canonicalHostname: (partnerBranding as any)?.custom_domain || null,
      isAlias: true,
      branding: partnerBranding as unknown as WLHostBranding | null,
    };
  }

  // No match — treat as 24H host (could be misconfigured)
  return NOT_PARTNER;
}
