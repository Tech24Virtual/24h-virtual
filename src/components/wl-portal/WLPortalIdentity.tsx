import { useEffect } from 'react';
import { useWLHostResolver } from '@/contexts/WLHostContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Mounted inside HostnameRouter on partner custom-domain hostnames.
 * Injects the per-partner PWA manifest link so Add-to-Home-Screen uses
 * the partner's brand. Title/favicon/theme-color are handled by
 * WLPortalContext (which runs for both path-based and custom-domain routes).
 */
export function WLPortalIdentity() {
  const { isPartnerHostname, partnerId } = useWLHostResolver() as any;

  useEffect(() => {
    if (!isPartnerHostname || !partnerId || !SUPABASE_URL) return;

    const existing = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    const previousHref = existing?.href ?? null;
    let manifestLink = existing;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = `${SUPABASE_URL}/functions/v1/wl-manifest?partner=${partnerId}`;

    return () => {
      if (!manifestLink) return;
      if (previousHref) manifestLink.href = previousHref;
      else manifestLink.remove();
    };
  }, [isPartnerHostname, partnerId]);

  return null;
}
