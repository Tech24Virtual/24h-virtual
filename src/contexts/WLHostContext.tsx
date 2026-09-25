import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolveHostname, is24HHost, getSubdomainType, getBaseDomain, type WLHostResolution } from '@/lib/wlHostResolver';

interface WLHostContextType extends WLHostResolution {
  loading: boolean;
  subdomainType: 'dashboard' | 'client' | 'main';
  baseDomain: string | null;
}

const defaultValue: WLHostContextType = {
  isPartnerHostname: false,
  partnerId: null,
  partnerSlug: null,
  canonicalHostname: null,
  isAlias: false,
  branding: null,
  loading: true,
  subdomainType: 'main',
  baseDomain: null,
};

const WLHostContext = createContext<WLHostContextType>(defaultValue);

const CACHE_KEY_PREFIX = 'wl_host_';

export function WLHostProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WLHostContextType>(defaultValue);

  useEffect(() => {
    const hostname = window.location.hostname;
    const subdomainType = getSubdomainType(hostname);
    const baseDomain = getBaseDomain(hostname);
    // dashboard./clients. are intentional, permanent entry points for two
    // different app areas on the same domain — never bounce them to the
    // bare canonical domain the way a legacy/migrated alias should be.
    const isSubdomainAlias = subdomainType !== 'main';

    // Fast path: 24H host — no query needed
    if (is24HHost(hostname)) {
      setState({ ...defaultValue, loading: false, subdomainType, baseDomain });
      return;
    }

    // Check session cache
    const cacheKey = CACHE_KEY_PREFIX + hostname;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WLHostResolution;
        setState({ ...parsed, loading: false, subdomainType, baseDomain });
        // Handle alias redirect from cache
        if (parsed.isAlias && parsed.canonicalHostname && !isSubdomainAlias) {
          redirectToCanonical(parsed.canonicalHostname);
        }
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Resolve hostname
    resolveHostname(hostname).then((result) => {
      // Handle alias → canonical redirect (skip for dashboard./clients. subdomains)
      if (result.isAlias && result.canonicalHostname && !isSubdomainAlias) {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        redirectToCanonical(result.canonicalHostname);
        return;
      }

      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setState({ ...result, loading: false, subdomainType, baseDomain });
    }).catch(() => {
      setState({ ...defaultValue, isPartnerHostname: false, loading: false, subdomainType, baseDomain });
    });
  }, []);

  return (
    <WLHostContext.Provider value={state}>
      {children}
    </WLHostContext.Provider>
  );
}

function redirectToCanonical(canonicalHostname: string) {
  const { pathname, search, hash } = window.location;
  const target = `https://${canonicalHostname}${pathname}${search}${hash}`;
  window.location.replace(target);
}

export function useWLHostResolver() {
  return useContext(WLHostContext);
}
