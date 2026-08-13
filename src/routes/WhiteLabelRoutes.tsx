import { lazy } from "react";
import { Route, Navigate, Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";

const WhiteLabelDashboard = lazy(() => import("@/pages/white-label-dashboard/WhiteLabelDashboard"));
const WhiteLabelClients = lazy(() => import("@/pages/white-label-dashboard/Clients"));
const WLClientDetail = lazy(() => import("@/pages/white-label-dashboard/ClientDetail"));
const WLPartnerLeadsPage = lazy(() => import("@/pages/white-label-dashboard/Leads"));
const WLPartnerPipelinePage = lazy(() => import("@/pages/white-label-dashboard/Pipeline"));
const WLProposals = lazy(() => import("@/pages/white-label-dashboard/Proposals"));
const WLProposalNew = lazy(() => import("@/pages/white-label-dashboard/ProposalNew"));
const WLProposalDetail = lazy(() => import("@/pages/white-label-dashboard/ProposalDetail"));
const WhiteLabelBranding = lazy(() => import("@/pages/white-label-dashboard/Branding"));
const WLCustomDomain = lazy(() => import("@/pages/white-label-dashboard/CustomDomain"));
const WhiteLabelBilling = lazy(() => import("@/pages/white-label-dashboard/Billing"));
const WhiteLabelSettings = lazy(() => import("@/pages/white-label-dashboard/Settings"));
const WhiteLabelSupport = lazy(() => import("@/pages/white-label-dashboard/Support"));
const WLSupportDetail = lazy(() => import("@/pages/white-label-dashboard/SupportDetail"));
const WLFeedbackQueue = lazy(() => import("@/pages/white-label-dashboard/Feedback"));
const WLUsageDashboard = lazy(() => import("@/pages/white-label-dashboard/Usage"));
const WLClientTickets = lazy(() => import("@/pages/white-label-dashboard/ClientTickets"));
const WLCampaigns = lazy(() => import("@/pages/white-label-dashboard/Campaigns"));
const WLCampaignOs = lazy(() => import("@/pages/white-label-dashboard/CampaignOs"));
const WLKnowledgeBase = lazy(() => import("@/pages/white-label-dashboard/KnowledgeBase"));
const WLPricing = lazy(() => import("@/pages/white-label-dashboard/WholesalePricing"));
const WLAgreements = lazy(() => import("@/pages/white-label-dashboard/Agreements"));
const WLGrowthHub = lazy(() => import("@/pages/white-label-dashboard/GrowthHub"));
const WLGrowthHubBlog = lazy(() => import("@/pages/white-label-dashboard/GrowthHubBlog"));
const WLGrowthHubKeywords = lazy(() => import("@/pages/white-label-dashboard/GrowthHubKeywords"));
const WLGrowthHubWordPress = lazy(() => import("@/pages/white-label-dashboard/GrowthHubWordPress"));
const WLGrowthHubSocial = lazy(() => import("@/pages/white-label-dashboard/GrowthHubSocial"));
const WLGrowthHubReports = lazy(() => import("@/pages/white-label-dashboard/GrowthHubReports"));
const WLGrowthHubNewsletter = lazy(() => import("@/pages/white-label-dashboard/GrowthHubNewsletter"));
const WLGrowthHubEmail = lazy(() => import("@/pages/white-label-dashboard/GrowthHubEmail"));
const WLOnboarding = lazy(() => import("@/pages/white-label-dashboard/Onboarding"));
const WLOnboardingDetail = lazy(() => import("@/pages/white-label-dashboard/OnboardingDetail"));
const WLTeam = lazy(() => import("@/pages/white-label-dashboard/Team"));
const WLTasks = lazy(() => import("@/pages/white-label-dashboard/Tasks"));
const WLPlans = lazy(() => import("@/pages/white-label-dashboard/Plans"));
const WLServiceConfig = lazy(() => import("@/pages/white-label-dashboard/ServiceConfig"));

function WLLayoutWrapper() {
  return (
    <ProtectedRoute requiredRole="white_label">
      <WhiteLabelLayout>
        <Outlet />
      </WhiteLabelLayout>
    </ProtectedRoute>
  );
}

export const WhiteLabelRoutes = (
  <>
    <Route element={<WLLayoutWrapper />}>
      {/* ── Core ── */}
      <Route path="/white-label-dashboard" element={<LazyRoute><WhiteLabelDashboard /></LazyRoute>} />

      {/* ── Clients ── */}
      <Route path="/white-label-dashboard/clients" element={<LazyRoute><WhiteLabelClients /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/:id" element={<LazyRoute><WLClientDetail /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/leads" element={<LazyRoute><WLPartnerLeadsPage /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/pipeline" element={<LazyRoute><WLPartnerPipelinePage /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/proposals" element={<LazyRoute><WLProposals /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/proposals/new" element={<LazyRoute><WLProposalNew /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/proposals/:id" element={<LazyRoute><WLProposalDetail /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/onboarding" element={<LazyRoute><WLOnboarding /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/onboarding/:id" element={<LazyRoute><WLOnboardingDetail /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/usage" element={<LazyRoute><WLUsageDashboard /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/tasks" element={<LazyRoute><WLTasks /></LazyRoute>} />
      <Route path="/white-label-dashboard/clients/tickets" element={<LazyRoute><WLClientTickets /></LazyRoute>} />
      <Route path="/white-label-dashboard/plans" element={<LazyRoute><WLPlans /></LazyRoute>} />
      <Route path="/white-label-dashboard/service-config" element={<LazyRoute><WLServiceConfig /></LazyRoute>} />

      {/* ── Campaigns ── */}
      <Route path="/white-label-dashboard/campaigns" element={<LazyRoute><WLCampaigns /></LazyRoute>} />
      <Route path="/white-label-dashboard/campaigns/campaign-os" element={<LazyRoute><WLCampaignOs /></LazyRoute>} />
      <Route path="/white-label-dashboard/campaigns/knowledge-base" element={<LazyRoute><WLKnowledgeBase /></LazyRoute>} />

      {/* ── Growth ── */}
      <Route path="/white-label-dashboard/growth" element={<LazyRoute><WLGrowthHub /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/blog" element={<LazyRoute><WLGrowthHubBlog /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/keywords" element={<LazyRoute><WLGrowthHubKeywords /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/wordpress" element={<LazyRoute><WLGrowthHubWordPress /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/social" element={<LazyRoute><WLGrowthHubSocial /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/reports" element={<LazyRoute><WLGrowthHubReports /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/newsletter" element={<LazyRoute><WLGrowthHubNewsletter /></LazyRoute>} />
      <Route path="/white-label-dashboard/growth/email" element={<LazyRoute><WLGrowthHubEmail /></LazyRoute>} />

      {/* ── Account ── */}
      <Route path="/white-label-dashboard/account/billing" element={<LazyRoute><WhiteLabelBilling /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/pricing" element={<LazyRoute><WLPricing /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/agreements" element={<LazyRoute><WLAgreements /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/branding" element={<LazyRoute><WhiteLabelBranding /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/branding/custom-domain" element={<LazyRoute><WLCustomDomain /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/team" element={<LazyRoute><WLTeam /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/support" element={<LazyRoute><WhiteLabelSupport /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/support/:id" element={<LazyRoute><WLSupportDetail /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/feedback" element={<LazyRoute><WLFeedbackQueue /></LazyRoute>} />
      <Route path="/white-label-dashboard/account/settings" element={<LazyRoute><WhiteLabelSettings /></LazyRoute>} />
    </Route>

    {/* ── Legacy redirects (old URLs → new hierarchical paths) ── */}
    <Route path="/white-label-dashboard/leads" element={<Navigate to="/white-label-dashboard/clients/leads" replace />} />
    <Route path="/white-label-dashboard/pipeline" element={<Navigate to="/white-label-dashboard/clients/pipeline" replace />} />
    <Route path="/white-label-dashboard/proposals" element={<Navigate to="/white-label-dashboard/clients/proposals" replace />} />
    <Route path="/white-label-dashboard/proposals/new" element={<Navigate to="/white-label-dashboard/clients/proposals/new" replace />} />
    <Route path="/white-label-dashboard/proposals/:id" element={<Navigate to="/white-label-dashboard/clients/proposals/:id" replace />} />
    <Route path="/white-label-dashboard/onboarding" element={<Navigate to="/white-label-dashboard/clients/onboarding" replace />} />
    <Route path="/white-label-dashboard/onboarding/:id" element={<Navigate to="/white-label-dashboard/clients/onboarding/:id" replace />} />
    <Route path="/white-label-dashboard/usage" element={<Navigate to="/white-label-dashboard/clients/usage" replace />} />
    <Route path="/white-label-dashboard/tasks" element={<Navigate to="/white-label-dashboard/clients/tasks" replace />} />
    <Route path="/white-label-dashboard/client-tickets" element={<Navigate to="/white-label-dashboard/clients/tickets" replace />} />
    <Route path="/white-label-dashboard/campaign-os" element={<Navigate to="/white-label-dashboard/campaigns/campaign-os" replace />} />
    <Route path="/white-label-dashboard/knowledge-base" element={<Navigate to="/white-label-dashboard/campaigns/knowledge-base" replace />} />
    <Route path="/white-label-dashboard/growth-hub" element={<Navigate to="/white-label-dashboard/growth" replace />} />
    <Route path="/white-label-dashboard/growth-hub/blog" element={<Navigate to="/white-label-dashboard/growth/blog" replace />} />
    <Route path="/white-label-dashboard/growth-hub/keywords" element={<Navigate to="/white-label-dashboard/growth/keywords" replace />} />
    <Route path="/white-label-dashboard/growth-hub/wordpress" element={<Navigate to="/white-label-dashboard/growth/wordpress" replace />} />
    <Route path="/white-label-dashboard/growth-hub/social" element={<Navigate to="/white-label-dashboard/growth/social" replace />} />
    <Route path="/white-label-dashboard/growth-hub/reports" element={<Navigate to="/white-label-dashboard/growth/reports" replace />} />
    <Route path="/white-label-dashboard/growth-hub/newsletter" element={<Navigate to="/white-label-dashboard/growth/newsletter" replace />} />
    <Route path="/white-label-dashboard/growth-hub/email" element={<Navigate to="/white-label-dashboard/growth/email" replace />} />
    <Route path="/white-label-dashboard/billing" element={<Navigate to="/white-label-dashboard/account/billing" replace />} />
    <Route path="/white-label-dashboard/pricing" element={<Navigate to="/white-label-dashboard/account/pricing" replace />} />
    <Route path="/white-label-dashboard/agreements" element={<Navigate to="/white-label-dashboard/account/agreements" replace />} />
    <Route path="/white-label-dashboard/branding" element={<Navigate to="/white-label-dashboard/account/branding" replace />} />
    <Route path="/white-label-dashboard/branding/custom-domain" element={<Navigate to="/white-label-dashboard/account/branding/custom-domain" replace />} />
    <Route path="/white-label-dashboard/team" element={<Navigate to="/white-label-dashboard/account/team" replace />} />
    <Route path="/white-label-dashboard/support" element={<Navigate to="/white-label-dashboard/account/support" replace />} />
    <Route path="/white-label-dashboard/support/:id" element={<Navigate to="/white-label-dashboard/account/support/:id" replace />} />
    <Route path="/white-label-dashboard/feedback" element={<Navigate to="/white-label-dashboard/account/feedback" replace />} />
    <Route path="/white-label-dashboard/settings" element={<Navigate to="/white-label-dashboard/account/settings" replace />} />
  </>
);
