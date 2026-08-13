import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";

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

const guard = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="white_label"><LazyRoute>{el}</LazyRoute></ProtectedRoute>
);

export const WhiteLabelRoutes = (
  <>
    {/* ── Core ── */}
    <Route path="/white-label-dashboard" element={guard(<WhiteLabelDashboard />)} />

    {/* ── Clients ── */}
    <Route path="/white-label-dashboard/clients" element={guard(<WhiteLabelClients />)} />
    <Route path="/white-label-dashboard/clients/:id" element={guard(<WLClientDetail />)} />
    <Route path="/white-label-dashboard/clients/leads" element={guard(<WLPartnerLeadsPage />)} />
    <Route path="/white-label-dashboard/clients/pipeline" element={guard(<WLPartnerPipelinePage />)} />
    <Route path="/white-label-dashboard/clients/proposals" element={guard(<WLProposals />)} />
    <Route path="/white-label-dashboard/clients/proposals/new" element={guard(<WLProposalNew />)} />
    <Route path="/white-label-dashboard/clients/proposals/:id" element={guard(<WLProposalDetail />)} />
    <Route path="/white-label-dashboard/clients/onboarding" element={guard(<WLOnboarding />)} />
    <Route path="/white-label-dashboard/clients/onboarding/:id" element={guard(<WLOnboardingDetail />)} />
    <Route path="/white-label-dashboard/clients/usage" element={guard(<WLUsageDashboard />)} />
    <Route path="/white-label-dashboard/clients/tasks" element={guard(<WLTasks />)} />
    <Route path="/white-label-dashboard/clients/tickets" element={guard(<WLClientTickets />)} />
    <Route path="/white-label-dashboard/plans" element={guard(<WLPlans />)} />

    {/* ── Campaigns ── */}
    <Route path="/white-label-dashboard/campaigns" element={guard(<WLCampaigns />)} />
    <Route path="/white-label-dashboard/campaigns/campaign-os" element={guard(<WLCampaignOs />)} />
    <Route path="/white-label-dashboard/campaigns/knowledge-base" element={guard(<WLKnowledgeBase />)} />

    {/* ── Growth ── */}
    <Route path="/white-label-dashboard/growth" element={guard(<WLGrowthHub />)} />
    <Route path="/white-label-dashboard/growth/blog" element={guard(<WLGrowthHubBlog />)} />
    <Route path="/white-label-dashboard/growth/keywords" element={guard(<WLGrowthHubKeywords />)} />
    <Route path="/white-label-dashboard/growth/wordpress" element={guard(<WLGrowthHubWordPress />)} />
    <Route path="/white-label-dashboard/growth/social" element={guard(<WLGrowthHubSocial />)} />
    <Route path="/white-label-dashboard/growth/reports" element={guard(<WLGrowthHubReports />)} />
    <Route path="/white-label-dashboard/growth/newsletter" element={guard(<WLGrowthHubNewsletter />)} />
    <Route path="/white-label-dashboard/growth/email" element={guard(<WLGrowthHubEmail />)} />

    {/* ── Account ── */}
    <Route path="/white-label-dashboard/account/billing" element={guard(<WhiteLabelBilling />)} />
    <Route path="/white-label-dashboard/account/pricing" element={guard(<WLPricing />)} />
    <Route path="/white-label-dashboard/account/agreements" element={guard(<WLAgreements />)} />
    <Route path="/white-label-dashboard/account/branding" element={guard(<WhiteLabelBranding />)} />
    <Route path="/white-label-dashboard/account/branding/custom-domain" element={guard(<WLCustomDomain />)} />
    <Route path="/white-label-dashboard/account/team" element={guard(<WLTeam />)} />
    <Route path="/white-label-dashboard/account/support" element={guard(<WhiteLabelSupport />)} />
    <Route path="/white-label-dashboard/account/support/:id" element={guard(<WLSupportDetail />)} />
    <Route path="/white-label-dashboard/account/feedback" element={guard(<WLFeedbackQueue />)} />
    <Route path="/white-label-dashboard/account/settings" element={guard(<WhiteLabelSettings />)} />

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
