import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";

const AffiliateDashboardNew = lazy(() => import("@/pages/affiliate/AffiliateDashboard"));
const AffiliateReferrals = lazy(() => import("@/pages/affiliate/AffiliateReferrals"));
const AffiliatePerformance = lazy(() => import("@/pages/affiliate/AffiliatePerformance"));
const AffiliatePayouts = lazy(() => import("@/pages/affiliate/AffiliatePayouts"));
const AffiliateMarketing = lazy(() => import("@/pages/affiliate/AffiliateMarketing"));
const AffiliateSupport = lazy(() => import("@/pages/affiliate/AffiliateSupport"));
const AffiliateSettings = lazy(() => import("@/pages/affiliate/AffiliateSettings"));
const AffiliateBrandAssets = lazy(() => import("@/pages/affiliate/AffiliateBrandAssets"));

const guard = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="affiliate"><LazyRoute>{el}</LazyRoute></ProtectedRoute>
);

export const AffiliateRoutes = (
  <>
    <Route path="/affiliate" element={guard(<AffiliateDashboardNew />)} />
    <Route path="/affiliate/referrals" element={guard(<AffiliateReferrals />)} />
    <Route path="/affiliate/performance" element={guard(<AffiliatePerformance />)} />
    <Route path="/affiliate/payouts" element={guard(<AffiliatePayouts />)} />
    <Route path="/affiliate/marketing" element={guard(<AffiliateMarketing />)} />
    <Route path="/affiliate/support" element={guard(<AffiliateSupport />)} />
    <Route path="/affiliate/brand-assets" element={guard(<AffiliateBrandAssets />)} />
    <Route path="/affiliate/settings" element={guard(<AffiliateSettings />)} />
    <Route path="/affiliate-dashboard" element={<Navigate to="/affiliate" replace />} />
  </>
);
