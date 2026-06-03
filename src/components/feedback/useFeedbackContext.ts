import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWLHostResolver } from '@/contexts/WLHostContext';

export type FeedbackBrand = '24h' | 'partner';
export type FeedbackSurface =
  | 'admin' | 'staff' | 'hr' | 'direct_client' | 'affiliate'
  | 'wl_partner' | 'wl_end_client';

export interface FeedbackContext {
  brand: FeedbackBrand;
  surface: FeedbackSurface;
  isPartnerUser: boolean;
  isEndClient: boolean;
  partnerCompanyName: string | null;
  portalSlug: string | null;
  page: string;
}

/** Pure UI hint — server is authoritative for routing. */
export function useFeedbackContext(): FeedbackContext {
  const { roles } = useAuth();
  const host = useWLHostResolver();
  const location = useLocation();
  const params = useParams<{ slug?: string }>();

  const isPartnerHost = host.isPartnerHostname;
  const portalSlugMatch = location.pathname.match(/^\/portal\/([^/]+)/);
  const portalSlug = params.slug ?? portalSlugMatch?.[1] ?? host.partnerSlug ?? null;

  const isEndClient = roles.includes('wl_client' as any);
  const isPartnerUser = roles.includes('white_label' as any);

  // Brand resolution: end-client surface OR partner host → partner brand
  const onPartnerSurface = isPartnerHost || !!portalSlugMatch || isEndClient;
  const brand: FeedbackBrand = onPartnerSurface && !isPartnerUser ? 'partner'
    : isPartnerUser ? 'partner'  // partner sees partner branding in their dashboard
    : '24h';

  let surface: FeedbackSurface = 'direct_client';
  const path = location.pathname;
  if (isEndClient || portalSlugMatch) surface = 'wl_end_client';
  else if (isPartnerUser || path.startsWith('/wl/')) surface = 'wl_partner';
  else if (path.startsWith('/admin')) surface = 'admin';
  else if (path.startsWith('/hr')) surface = 'hr';
  else if (path.startsWith('/affiliate')) surface = 'affiliate';
  else if (path.startsWith('/staff')) surface = 'staff';

  return {
    brand,
    surface,
    isPartnerUser,
    isEndClient,
    partnerCompanyName: host.branding?.company_name ?? null,
    portalSlug,
    page: location.pathname,
  };
}
