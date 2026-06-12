import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWLHostResolver } from '@/contexts/WLHostContext';
import { useAuth } from '@/contexts/AuthContext';
import { WLPortalProvider } from '@/contexts/WLPortalContext';
import { WLPortalIdentity } from '@/components/wl-portal/WLPortalIdentity';
import { WLPortalRoute } from '@/components/wl-portal/WLPortalRoute';
import { PageLoader } from '@/components/ui/PageLoader';
import { supabase } from '@/integrations/supabase/client';

// Lazy load WL portal pages (same imports as App.tsx)
const WLPortalLogin = lazy(() => import('@/pages/wl-portal/WLPortalLogin'));
const WLPortalDashboard = lazy(() => import('@/pages/wl-portal/WLPortalDashboard'));
const WLPortalCallLogs = lazy(() => import('@/pages/wl-portal/WLPortalCallLogs'));
const WLPortalScripts = lazy(() => import('@/pages/wl-portal/WLPortalScripts'));
const WLPortalSchedule = lazy(() => import('@/pages/wl-portal/WLPortalSchedule'));
const WLPortalBilling = lazy(() => import('@/pages/wl-portal/WLPortalBilling'));
const WLPortalSupport = lazy(() => import('@/pages/wl-portal/WLPortalSupport'));
const WLPortalSettings = lazy(() => import('@/pages/wl-portal/WLPortalSettings'));
const WLPortalOutboundRequests = lazy(() => import('@/pages/wl-portal/WLPortalOutboundRequests'));

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

function PartnerPortalGuard({ children }: { children: React.ReactNode }) {
  const { partnerId } = useWLHostResolver();
  return (
    <WLPortalProvider partnerIdOverride={partnerId || undefined}>
      <WLPortalRoute>{children}</WLPortalRoute>
    </WLPortalProvider>
  );
}

/** Redirect root / to /login or /{slug} */
function PartnerRootRedirect() {
  const { user } = useAuth();
  const { partnerId } = useWLHostResolver();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!partnerId) return;

    // Find user's client slug for this partner
    supabase
      .from('white_label_clients')
      .select('client_portal_slug')
      .eq('user_id', user.id)
      .eq('partner_id', partnerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.client_portal_slug) {
          navigate(`/${data.client_portal_slug}`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      });
  }, [user, partnerId, navigate]);

  return <PageLoader />;
}

/** Strip /portal/ prefix on partner hostnames */
function PortalPrefixRedirect() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // /portal/some-slug/calls → /some-slug/calls
    const match = pathname.match(/^\/portal\/(.+)$/);
    if (match) {
      navigate(`/${match[1]}${search}${hash}`, { replace: true });
    }
  }, [pathname, search, hash, navigate]);

  return <PageLoader />;
}

interface HostnameRouterProps {
  children: React.ReactNode;
}

export function HostnameRouter({ children }: HostnameRouterProps) {
  const { isPartnerHostname, loading, partnerId } = useWLHostResolver();

  if (loading) return <PageLoader />;

  // On 24H host — render the normal app route tree
  if (!isPartnerHostname) return <>{children}</>;

  // On partner hostname — mount the WL portal route tree with clean URLs
  return (
    <>
      <WLPortalIdentity />
      <Routes>
      {/* Root redirect */}
      <Route path="/" element={<PartnerRootRedirect />} />

      {/* Login at /login — WLPortalProvider applies branding before auth */}
      <Route path="/login" element={
        <LazyRoute>
          <WLPortalProvider partnerIdOverride={partnerId || undefined}>
            <WLPortalLogin />
          </WLPortalProvider>
        </LazyRoute>
      } />

      {/* Redirect /portal/* to clean URLs */}
      <Route path="/portal/*" element={<PortalPrefixRedirect />} />

      {/* Client workspace routes: /:slug/* */}
      <Route path="/:slug" element={<LazyRoute><PartnerPortalGuard><WLPortalDashboard /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/calls" element={<LazyRoute><PartnerPortalGuard><WLPortalCallLogs /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/scripts" element={<LazyRoute><PartnerPortalGuard><WLPortalScripts /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/schedule" element={<LazyRoute><PartnerPortalGuard><WLPortalSchedule /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/billing" element={<LazyRoute><PartnerPortalGuard><WLPortalBilling /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/support" element={<LazyRoute><PartnerPortalGuard><WLPortalSupport /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/settings" element={<LazyRoute><PartnerPortalGuard><WLPortalSettings /></PartnerPortalGuard></LazyRoute>} />
      <Route path="/:slug/outbound-requests" element={<LazyRoute><PartnerPortalGuard><WLPortalOutboundRequests /></PartnerPortalGuard></LazyRoute>} />

      {/* Catch-all on partner hostname → 404 (not unauthorized, to avoid leaking) */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </div>
      } />
      </Routes>
    </>
  );
}
