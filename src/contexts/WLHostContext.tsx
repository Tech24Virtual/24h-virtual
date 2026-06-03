import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolveHostname, is24HHost, type WLHostResolution } from '@/lib/wlHostResolver';

interface WLHostContextType extends WLHostResolution {
  loading: boolean;
}

const defaultValue: WLHostContextType = {
  isPartnerHostname: false,
  partnerId: null,
  partnerSlug: null,
  canonicalHostname: null,
  isAlias: false,
  branding: null,
  loading: true,
};

const WLHostContext = createContext<WLHostContextType>(defaultValue);

const CACHE_KEY_PREFIX = 'wl_host_';

export function WLHostProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WLHostContextType>(defaultValue);

  useEffect(() => {
    const hostname = window.location.hostname;

    // Fast path: 24H host — no query needed
    if (is24HHost(hostname)) {
      setState({ ...defaultValue, loading: false });
      return;
    }

    // Check session cache
    const cacheKey = CACHE_KEY_PREFIX + hostname;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WLHostResolution;
        setState({ ...parsed, loading: false });
        // Handle alias redirect from cache
        if (parsed.isAlias && parsed.canonicalHostname) {
          redirectToCanonical(parsed.canonicalHostname);
        }
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Resolve hostname
    resolveHostname(hostname).then((result) => {
      // Handle alias → canonical redirect
      if (result.isAlias && result.canonicalHostname) {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        redirectToCanonical(result.canonicalHostname);
        return;
      }

      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setState({ ...result, loading: false });
    }).catch(() => {
      setState({ ...defaultValue, isPartnerHostname: false, loading: false });
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
