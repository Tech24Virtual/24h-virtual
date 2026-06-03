import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";

import { ProductTestingProvider } from "@/contexts/ProductTestingContext";
import { TestModeBanner } from "@/components/testing/TestModeBanner";
import { Auth412Watcher } from "@/components/testing/Auth412Watcher";
import { QAChecklistOverlay } from "@/components/testing/QAChecklistOverlay";
import { CaptureForChatButton } from "@/components/testing/CaptureForChatButton";

import { AuthProvider } from "@/contexts/AuthContext";
import { WLHostProvider } from "@/contexts/WLHostContext";
import { HostnameRouter } from "@/components/wl-portal/HostnameRouter";

import { TrackingPixels } from "@/components/analytics/TrackingPixels";
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { FloatingSearch } from "@/components/ui/FloatingSearch";
import { ExitIntentPopup } from "@/components/popups/ExitIntentPopup";
import { FloatingCTA } from "@/components/popups/FloatingCTA";
import { StickyMobileCTA } from "@/components/mobile/StickyMobileCTA";
import { ScrollRestoration } from "@/components/ScrollRestoration";

import NotFound from "@/pages/NotFound";
import RunCampaignScript from "@/pages/run/RunCampaignScript";

// Per-role route trees (Phase 9 refactor)
import { PublicRoutes } from "@/routes/PublicRoutes";
import { ClientRoutes } from "@/routes/ClientRoutes";
import { AdminRoutes } from "@/routes/AdminRoutes";
import { StaffRoutes } from "@/routes/StaffRoutes";
import { AffiliateRoutes } from "@/routes/AffiliateRoutes";
import { HRRoutes } from "@/routes/HRRoutes";
import { WhiteLabelRoutes } from "@/routes/WhiteLabelRoutes";
import { WLPortalRoutes } from "@/routes/WLPortalRoutes";

const DASHBOARD_PREFIXES = [
  "/admin",
  "/client-dashboard",
  "/staff",
  "/hr-portal",
  "/affiliate",
  "/white-label-dashboard",
  "/portal",
  "/widget",
  "/p/",
  "/run/",
];

function PublicFloatingWidgets() {
  const { pathname } = useLocation();
  if (DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return (
    <>
      <ScrollToTop />
      <FloatingSearch />
    </>
  );
}

function ConditionalChrome() {
  const { pathname } = useLocation();
  if (
    pathname.startsWith("/widget") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/run/")
  )
    return null;
  return (
    <>
      <LiveChatWidget />
      <FloatingCTA />
      <StickyMobileCTA />
      <ExitIntentPopup />
    </>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <WLHostProvider>
                <HostnameRouter>
                  <ProductTestingProvider>
                  <TrackingPixels />
                  <ScrollRestoration />
                  <TestModeBanner />
                  <Auth412Watcher />
                  <QAChecklistOverlay />
                  <CaptureForChatButton />
                  {/* Skip to main content link for keyboard accessibility */}
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    Skip to main content
                  </a>
                  <main id="main-content">
                    <Routes>
                      {PublicRoutes}
                      {ClientRoutes}
                      {AdminRoutes}
                      {StaffRoutes}
                      {AffiliateRoutes}
                      {HRRoutes}
                      {WhiteLabelRoutes}
                      {WLPortalRoutes}
                      {/* Wave 2 Batch E — chromeless iframe runtime for Five9 */}
                      <Route path="/run/campaign/:campaignId/script" element={<RunCampaignScript />} />
                      {/* Superadmin alias for Product Testing */}
                      <Route
                        path="/superadmin/settings/product-testing"
                        element={<Navigate to="/admin/settings/product-testing" replace />}
                      />
                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <ConditionalChrome />
                  <PublicFloatingWidgets />
                  </ProductTestingProvider>
                </HostnameRouter>
              </WLHostProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
