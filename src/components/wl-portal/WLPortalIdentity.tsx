import { useEffect } from 'react';
import { useWLHostResolver } from '@/contexts/WLHostContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Mounted globally inside WLHostProvider. When on a partner hostname, swaps
 * document.title, favicon, theme-color, and PWA manifest so nothing branded
 * "24H Virtual" leaks into the browser tab or Add-to-Home-Screen experience.
 */
export function WLPortalIdentity() {
  const { isPartnerHostname, branding, partnerId } = useWLHostResolver() as any;

  useEffect(() => {
    if (!isPartnerHostname || !branding) return;

    const brandName = branding.company_name || 'Client Portal';
    const previousTitle = document.title;
    document.title = brandName;

    // Favicon
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    const previousHref = faviconLink?.href || null;
    if (branding.favicon_url) {
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = branding.favicon_url;
    }

    // theme-color
    let themeMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
    const previousTheme = themeMeta?.content || null;
    if (branding.primary_color) {
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = branding.primary_color;
    }

    // Per-partner PWA manifest (Add to Home Screen with partner brand)
    let manifestLink: HTMLLinkElement | null = null;
    let previousManifestHref: string | null = null;
    const existingManifest = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    if (partnerId && SUPABASE_URL) {
      manifestLink = existingManifest;
      previousManifestHref = existingManifest?.href || null;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = `${SUPABASE_URL}/functions/v1/wl-manifest?partner=${partnerId}`;
    }

    return () => {
      document.title = previousTitle;
      if (faviconLink && previousHref) faviconLink.href = previousHref;
      if (themeMeta && previousTheme) themeMeta.content = previousTheme;
      if (manifestLink) {
        if (previousManifestHref) manifestLink.href = previousManifestHref;
        else manifestLink.remove();
      }
    };
  }, [isPartnerHostname, branding, partnerId]);

  return null;
}
