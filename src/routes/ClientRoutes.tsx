import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";

const ClientDashboard = lazy(() => import("@/pages/client-dashboard/Dashboard"));
const CallLogs = lazy(() => import("@/pages/client-dashboard/CallLogs"));
const Scripts = lazy(() => import("@/pages/client-dashboard/Scripts"));
const Schedule = lazy(() => import("@/pages/client-dashboard/Schedule"));
const Billing = lazy(() => import("@/pages/client-dashboard/Billing"));
const ClientSettings = lazy(() => import("@/pages/client-dashboard/Settings"));
const ClientSupport = lazy(() => import("@/pages/client-dashboard/Support"));
const ClientReferrals = lazy(() => import("@/pages/client-dashboard/Referrals"));
const ClientOutboundRequests = lazy(() => import("@/pages/client-dashboard/OutboundRequests"));
const ClientCampaigns = lazy(() => import("@/pages/client-dashboard/Campaigns"));
const ClientCampaignDetail = lazy(() => import("@/pages/client-dashboard/CampaignDetail"));
const ClientFeedback = lazy(() => import("@/pages/client-dashboard/Feedback"));
const ClientSupportDetail = lazy(() => import("@/pages/client-dashboard/SupportDetail"));
const ClientSetup = lazy(() => import("@/pages/client-dashboard/Setup"));
const ClientGoLiveReadiness = lazy(() => import("@/pages/client-dashboard/GoLiveReadiness"));
const ClientReports = lazy(() => import("@/pages/client-dashboard/Reports"));

const guard = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole={["client", "wl_client"]}><LazyRoute>{el}</LazyRoute></ProtectedRoute>
);

export const ClientRoutes = (
  <>
    <Route path="/client-dashboard" element={guard(<ClientDashboard />)} />
    <Route path="/client-dashboard/calls" element={guard(<CallLogs />)} />
    <Route path="/client-dashboard/scripts" element={guard(<Scripts />)} />
    <Route path="/client-dashboard/schedule" element={guard(<Schedule />)} />
    <Route path="/client-dashboard/billing" element={guard(<Billing />)} />
    <Route path="/client-dashboard/referrals" element={guard(<ClientReferrals />)} />
    <Route path="/client-dashboard/support" element={guard(<ClientSupport />)} />
    <Route path="/client-dashboard/support/:id" element={guard(<ClientSupportDetail />)} />
    <Route path="/client-dashboard/settings" element={guard(<ClientSettings />)} />
    <Route path="/client-dashboard/calls/outbound" element={guard(<ClientOutboundRequests />)} />
    <Route path="/client-dashboard/calls/campaigns" element={guard(<ClientCampaigns />)} />
    <Route path="/client-dashboard/calls/campaigns/:id" element={guard(<ClientCampaignDetail />)} />
    <Route path="/client-dashboard/feedback" element={guard(<ClientFeedback />)} />
    <Route path="/client-dashboard/setup" element={guard(<ClientSetup />)} />
    <Route path="/client-dashboard/readiness" element={guard(<ClientGoLiveReadiness />)} />
    <Route path="/client-dashboard/reports" element={guard(<ClientReports />)} />
    {/* ── Legacy redirects ── */}
    <Route path="/client-dashboard/outbound-requests" element={<Navigate to="/client-dashboard/calls/outbound" replace />} />
    <Route path="/client-dashboard/campaigns" element={<Navigate to="/client-dashboard/calls/campaigns" replace />} />
    <Route path="/client-dashboard/campaigns/:id" element={<Navigate to="/client-dashboard/calls/campaigns/:id" replace />} />
  </>
);
