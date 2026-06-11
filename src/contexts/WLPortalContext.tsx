import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseEnabledModules, type WLModuleSlug, DEFAULT_ENABLED_MODULES } from '@/lib/wlModuleVisibility';

interface PartnerBranding {
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
}

interface WLClientInfo {
  id: string;
  partner_id: string;
  client_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  status: string | null;
  enabled_modules: WLModuleSlug[];
}

interface WLPortalContextType {
  slug: string;
  branding: PartnerBranding | null;
  clientInfo: WLClientInfo | null;
  partnerId: string | null;
  enabledModules: WLModuleSlug[];
  loading: boolean;
  clientLoading: boolean;
  error: string | null;
}

const WLPortalContext = createContext<WLPortalContextType | undefined>(undefined);

interface WLPortalProviderProps {
  children: ReactNode;
  partnerIdOverride?: string;
}

export function WLPortalProvider({ children, partnerIdOverride }: WLPortalProviderProps) {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [branding, setBranding] = useState<PartnerBranding | null>(null);
  const [clientInfo, setClientInfo] = useState<WLClientInfo | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(partnerIdOverride || null);
  const [loading, setLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If partner ID provided via hostname, skip slug-based resolution
    if (partnerIdOverride) {
      setPartnerId(partnerIdOverride);
      fetchBrandingById(partnerIdOverride);
      return;
    }
    if (!slug) return;
    fetchBranding();
  }, [slug, partnerIdOverride]);

  useEffect(() => {
    if (user && partnerId) fetchClientInfo();
  }, [user, partnerId]);

  const fetchBrandingById = async (pid: string) => {
    try {
      const { data: brandingData } = await supabase
        .from('white_label_branding')
        .select('*')
        .eq('partner_id', pid)
        .single();

      if (brandingData) {
        setBranding(brandingData as unknown as PartnerBranding);
      }
    } catch (err) {
      console.error('Error fetching portal branding by ID:', err);
      setError('Failed to load portal');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranding = async () => {
    try {
      let pid: string | null = null;

      // Fast path: resolve partner_id directly from partner_slug
      const { data: partnerRow } = await supabase
        .from('white_label_partners')
        .select('id')
        .eq('partner_slug' as never, slug as string)
        .maybeSingle();

      if (partnerRow) {
        pid = partnerRow.id;
      } else {
        // Fallback: legacy slug stored on a wl_client row
        const { data: clients } = await supabase
          .from('white_label_clients')
          .select('partner_id')
          .eq('client_portal_slug', slug)
          .limit(1);

        if (clients && clients.length > 0) {
          pid = clients[0].partner_id;
        }
      }

      if (!pid) {
        setError('Portal not found');
        setLoading(false);
        return;
      }

      setPartnerId(pid);

      const { data: brandingData } = await supabase
        .from('white_label_branding')
        .select('*')
        .eq('partner_id', pid)
        .single();

      if (brandingData) {
        setBranding(brandingData as unknown as PartnerBranding);
      }
    } catch (err) {
      console.error('Error fetching portal branding:', err);
      setError('Failed to load portal');
    } finally {
      setLoading(false);
    }
  };


  const fetchClientInfo = async () => {
    if (!user || !partnerId) return;
    setClientLoading(true);
    try {
      const { data } = await supabase
        .from('white_label_clients')
        .select('id, partner_id, client_name, contact_name, email, phone, status, enabled_modules')
        .eq('user_id', user.id)
        .eq('partner_id', partnerId)
        .single();

      if (data) {
        const raw = data as any;
        setClientInfo({
          ...raw,
          enabled_modules: parseEnabledModules(raw.enabled_modules),
        } as WLClientInfo);
      }
    } finally {
      setClientLoading(false);
    }
  };

  // Apply branding: document.title, favicon, theme-color, OG title, CSS vars, Google Fonts
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;

    // document.title
    const previousTitle = document.title;
    document.title = branding.company_name || 'Client Portal';

    // Favicon (with restore)
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    const previousFaviconHref = faviconLink?.href ?? null;
    const faviconCreated = !faviconLink && !!branding.favicon_url;
    if (branding.favicon_url) {
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = branding.favicon_url;
    }

    // theme-color (with restore)
    let themeMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
    const previousThemeColor = themeMeta?.content ?? null;
    const themeMetaCreated = !themeMeta && !!branding.primary_color;
    if (branding.primary_color) {
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = branding.primary_color;
    }

    // og:title (create if react-helmet-async removed the static index.html element)
    let ogTitleMeta = document.querySelector("meta[property='og:title']") as HTMLMetaElement | null;
    const previousOgTitle = ogTitleMeta?.content ?? null;
    const ogTitleCreated = !ogTitleMeta && !!branding.company_name;
    if (branding.company_name) {
      if (!ogTitleMeta) {
        ogTitleMeta = document.createElement('meta');
        ogTitleMeta.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitleMeta);
      }
      ogTitleMeta.content = branding.company_name;
    }

    // CSS variables
    if (branding.primary_color) root.style.setProperty('--wl-primary', branding.primary_color);
    if (branding.secondary_color) root.style.setProperty('--wl-secondary', branding.secondary_color);
    if (branding.accent_color) root.style.setProperty('--wl-accent', branding.accent_color);
    root.style.setProperty('--wl-sidebar-style', branding.sidebar_style || 'light');

    // Google Fonts
    const fontLinks: HTMLLinkElement[] = [];
    const fonts = [branding.font_heading, branding.font_body].filter(Boolean) as string[];
    if (fonts.length > 0) {
      const families = fonts.map(f => f.replace(/ /g, '+')).join('&family=');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
      document.head.appendChild(link);
      fontLinks.push(link);
    }
    if (branding.font_heading) root.style.setProperty('--wl-font-heading', `'${branding.font_heading}', sans-serif`);
    if (branding.font_body) root.style.setProperty('--wl-font-body', `'${branding.font_body}', sans-serif`);

    return () => {
      document.title = previousTitle;

      if (faviconCreated) faviconLink?.remove();
      else if (faviconLink && previousFaviconHref !== null) faviconLink.href = previousFaviconHref;

      if (themeMetaCreated) themeMeta?.remove();
      else if (themeMeta && previousThemeColor !== null) themeMeta.content = previousThemeColor;

      if (ogTitleCreated) ogTitleMeta?.remove();
      else if (ogTitleMeta && previousOgTitle !== null) ogTitleMeta.content = previousOgTitle;

      root.style.removeProperty('--wl-primary');
      root.style.removeProperty('--wl-secondary');
      root.style.removeProperty('--wl-accent');
      root.style.removeProperty('--wl-sidebar-style');
      root.style.removeProperty('--wl-font-heading');
      root.style.removeProperty('--wl-font-body');
      fontLinks.forEach(l => l.remove());
    };
  }, [branding]);

  return (
    <WLPortalContext.Provider value={{
      slug: slug || '',
      branding,
      clientInfo,
      partnerId,
      enabledModules: clientInfo?.enabled_modules ?? DEFAULT_ENABLED_MODULES,
      loading,
      clientLoading,
      error,
    }}>
      {children}
    </WLPortalContext.Provider>
  );
}

export function useWLPortal() {
  const context = useContext(WLPortalContext);
  if (!context) {
    throw new Error('useWLPortal must be used within a WLPortalProvider');
  }
  return context;
}
