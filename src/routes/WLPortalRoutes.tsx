import { lazy } from "react";
import { Route } from "react-router-dom";
import { WLPortalProvider } from "@/contexts/WLPortalContext";
import { WLPortalRoute } from "@/components/wl-portal/WLPortalRoute";
import { WLImpersonationBanner } from "@/components/admin/WLImpersonationBanner";
import { LazyRoute } from "./LazyRoute";
import type { WLModuleSlug } from "@/lib/wlModuleVisibility";

const WLPortalLogin = lazy(() => import("@/pages/wl-portal/WLPortalLogin"));
const WLPortalDashboard = lazy(() => import("@/pages/wl-portal/WLPortalDashboard"));
const WLPortalCallLogs = lazy(() => import("@/pages/wl-portal/WLPortalCallLogs"));
const WLPortalScripts = lazy(() => import("@/pages/wl-portal/WLPortalScripts"));
const WLPortalSchedule = lazy(() => import("@/pages/wl-portal/WLPortalSchedule"));
const WLPortalBilling = lazy(() => import("@/pages/wl-portal/WLPortalBilling"));
const WLPortalSupport = lazy(() => import("@/pages/wl-portal/WLPortalSupport"));
const WLPortalSettings = lazy(() => import("@/pages/wl-portal/WLPortalSettings"));
const WLPortalOutboundRequests = lazy(() => import("@/pages/wl-portal/WLPortalOutboundRequests"));
const WLPortalActivity = lazy(() => import("@/pages/wl-portal/WLPortalActivity"));
const WLPortalLeads = lazy(() => import("@/pages/wl-portal/WLPortalLeads"));
const WLPortalReviews = lazy(() => import("@/pages/wl-portal/WLPortalReviews"));
const WLPortalCampaigns = lazy(() => import("@/pages/wl-portal/WLPortalCampaigns"));
const WLPortalAdminCampaigns = lazy(() => import("@/pages/wl-portal/WLPortalAdminCampaigns"));
const WLPortalAdminCampaignDetail = lazy(() => import("@/pages/wl-portal/WLPortalAdminCampaignDetail"));
const WLPortalCampaignScript = lazy(() => import("@/pages/wl-portal/WLPortalCampaignScript"));
const WLPortalFeedback = lazy(() => import("@/pages/wl-portal/WLPortalFeedback"));

/** Wraps WL portal routes with the partner context + tenant isolation guard.
 *  Also renders the WLImpersonationBanner (D-4) when an admin is impersonating.
 */
function WLPortalRouteWrapper({
  children,
  requireModule,
}: {
  children: React.ReactNode;
  requireModule?: WLModuleSlug;
}) {
  return (
    <WLPortalProvider>
      <WLImpersonationBanner />
      <WLPortalRoute requireModule={requireModule}>{children}</WLPortalRoute>
    </WLPortalProvider>
  );
}

const wrap = (el: React.ReactNode, requireModule?: WLModuleSlug) => (
  <LazyRoute>
    <WLPortalRouteWrapper requireModule={requireModule}>{el}</WLPortalRouteWrapper>
  </LazyRoute>
);

export const WLPortalRoutes = (
  <>
    {/* Login is unprotected — auth happens here.
        WLPortalProvider is included so branding (title, favicon, colours) loads
        before the user signs in — the login page is the first brand touchpoint. */}
    <Route path="/portal/:slug/login" element={
      <LazyRoute>
        <WLPortalProvider>
          <WLPortalLogin />
        </WLPortalProvider>
      </LazyRoute>
    } />

    {/* Dashboard is always accessible (the portal landing page) */}
    <Route path="/portal/:slug" element={wrap(<WLPortalDashboard />, 'dashboard')} />
    <Route path="/portal/:slug/calls" element={wrap(<WLPortalCallLogs />, 'calls')} />
    <Route path="/portal/:slug/scripts" element={wrap(<WLPortalScripts />, 'scripts')} />
    <Route path="/portal/:slug/schedule" element={wrap(<WLPortalSchedule />, 'schedule')} />
    <Route path="/portal/:slug/billing" element={wrap(<WLPortalBilling />, 'billing')} />
    <Route path="/portal/:slug/support" element={wrap(<WLPortalSupport />, 'support')} />
    <Route path="/portal/:slug/feedback" element={wrap(<WLPortalFeedback />)} />
    <Route path="/portal/:slug/settings" element={wrap(<WLPortalSettings />, 'settings')} />
    <Route path="/portal/:slug/outbound-requests" element={wrap(<WLPortalOutboundRequests />, 'outbound-requests')} />
    <Route path="/portal/:slug/activity" element={wrap(<WLPortalActivity />, 'activity')} />
    <Route path="/portal/:slug/leads" element={wrap(<WLPortalLeads />, 'leads')} />
    <Route path="/portal/:slug/reviews" element={wrap(<WLPortalReviews />, 'reviews')} />
    <Route path="/portal/:slug/campaigns" element={wrap(<WLPortalCampaigns />, 'campaigns')} />
    <Route path="/portal/:slug/script" element={wrap(<WLPortalCampaignScript />, 'scripts')} />
    <Route path="/portal/:slug/admin/campaigns" element={wrap(<WLPortalAdminCampaigns />)} />
    <Route path="/portal/:slug/admin/campaigns/:id" element={wrap(<WLPortalAdminCampaignDetail />)} />
  </>
);
