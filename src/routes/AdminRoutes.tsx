import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";
import * as DiscSections from "@/pages/admin/discoverability/sections";

const Admin = lazy(() => import("@/pages/admin/Admin"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminLeadDetail = lazy(() => import("@/pages/admin/AdminLeadDetail"));
const AdminClients = lazy(() => import("@/pages/admin/AdminClients"));
const AdminCRM = lazy(() => import("@/pages/admin/AdminCRM"));
const AdminTickets = lazy(() => import("@/pages/admin/AdminTickets"));
const AdminTicketDetail = lazy(() => import("@/pages/admin/AdminTicketDetail"));
const AdminBilling = lazy(() => import("@/pages/admin/AdminBilling"));
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminPartners = lazy(() => import("@/pages/admin/AdminPartners"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminIntelligence = lazy(() => import("@/pages/admin/AdminIntelligence"));
const AdminDashboardEvents = lazy(() => import("@/pages/admin/AdminDashboardEvents"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const SupervisorScopeManager = lazy(() => import("@/pages/admin/users/SupervisorScopeManager"));
const AdminOutboundCalls = lazy(() => import("@/pages/admin/AdminOutboundCalls"));
const AdminBlog = lazy(() => import("@/pages/admin/AdminBlog"));
const AdminBlogEditor = lazy(() => import("@/pages/admin/AdminBlogEditor"));
const AdminKeywords = lazy(() => import("@/pages/admin/AdminKeywords"));
const AdminPartnerDetail = lazy(() => import("@/pages/admin/AdminPartnerDetail"));
const AdminGrowthHub = lazy(() => import("@/pages/admin/AdminGrowthHub"));
const AdminGrowthHubSocial = lazy(() => import("@/pages/admin/AdminGrowthHubSocial"));
const AdminGrowthHubReports = lazy(() => import("@/pages/admin/AdminGrowthHubReports"));
const AdminGrowthHubNewsletter = lazy(() => import("@/pages/admin/AdminGrowthHubNewsletter"));
const AdminGrowthHubWordPress = lazy(() => import("@/pages/admin/AdminGrowthHubWordPress"));
const AdminGrowthHubEmail = lazy(() => import("@/pages/admin/AdminGrowthHubEmail"));
const AdminArchitecture = lazy(() => import("@/pages/admin/AdminArchitecture"));
const AdminMissionControl = lazy(() => import("@/pages/admin/AdminMissionControl"));
const AdminLaunchChecklist = lazy(() => import("@/pages/admin/AdminLaunchChecklist"));
const AdminAuditLog = lazy(() => import("@/pages/admin/AdminAuditLog"));
const AdminFeedback = lazy(() => import("@/pages/admin/AdminFeedback"));
const AdminLaunchControls = lazy(() => import("@/pages/admin/AdminLaunchControls"));
const EmailPreview = lazy(() => import("@/pages/admin/EmailPreview"));
const AdminWLLeakAudit = lazy(() => import("@/pages/admin/AdminWLLeakAudit"));
const AdminWLHealth = lazy(() => import("@/pages/admin/AdminWLHealth"));
const AdminWLPreview = lazy(() => import("@/pages/admin/AdminWLPreview"));
const AdminWLConfigDiff = lazy(() => import("@/pages/admin/AdminWLConfigDiff"));
const Outline = lazy(() => import("@/pages/Outline"));
const WLClientsPortalList = lazy(() => import("@/pages/wl-clients/WLClientsPortalList"));
const DiscoverabilityLayout = lazy(() => import("@/pages/admin/discoverability/DiscoverabilityLayout"));
const DiscoverabilityOverview = lazy(() => import("@/pages/admin/discoverability/DiscoverabilityOverview"));
const AdminClientCallReport = lazy(() => import("@/pages/admin/AdminClientCallReport"));
const AdminFulfillmentIntake = lazy(() => import("@/pages/admin/AdminFulfillmentIntake"));
const AdminFulfillmentIntakeDetail = lazy(() => import("@/pages/admin/AdminFulfillmentIntakeDetail"));
const AdminProductTesting = lazy(() => import("@/pages/admin/AdminProductTesting"));
const CampaignOsLayout = lazy(() => import("@/pages/admin/campaign-os/CampaignOsLayout"));
const CampaignOsOverview = lazy(() => import("@/pages/admin/campaign-os/CampaignOsOverview"));
const CampaignOsDepartments = lazy(() => import("@/pages/admin/campaign-os/CampaignOsDepartments"));
const CampaignOsFields = lazy(() => import("@/pages/admin/campaign-os/CampaignOsFields"));
const CampaignOsFaqs = lazy(() => import("@/pages/admin/campaign-os/CampaignOsFaqs"));
const CampaignOsPolicies = lazy(() => import("@/pages/admin/campaign-os/CampaignOsPolicies"));
const CampaignOsFive9 = lazy(() => import("@/pages/admin/campaign-os/CampaignOsFive9"));
const CampaignOsDefaults = lazy(() => import("@/pages/admin/campaign-os/CampaignOsDefaults"));
const CampaignOsDrafts = lazy(() => import("@/pages/admin/campaign-os/CampaignOsDrafts"));
const CampaignOsCampaigns = lazy(() => import("@/pages/admin/campaign-os/CampaignOsCampaigns"));
const CampaignOsReporting = lazy(() => import("@/pages/admin/campaign-os/CampaignOsReporting"));
const CampaignOsCampaignDetail = lazy(() => import("@/pages/admin/campaign-os/CampaignOsCampaignDetail"));
const CampaignOsScriptBuilder = lazy(() => import("@/pages/admin/campaign-os/CampaignOsScriptBuilder"));
const CampaignVersions = lazy(() => import("@/pages/admin/campaign-os/CampaignVersions"));
const CampaignTemplates = lazy(() => import("@/pages/admin/campaign-os/CampaignTemplates"));
const CampaignsClients = lazy(() => import("@/pages/admin/campaign-os/Clients"));
const CampaignsClientDetail = lazy(() => import("@/pages/admin/campaign-os/ClientDetail"));
const CampaignsLocations = lazy(() => import("@/pages/admin/campaign-os/Locations"));
const CampaignsLocationDetail = lazy(() => import("@/pages/admin/campaign-os/LocationDetail"));
const CampaignsCallFlows = lazy(() => import("@/pages/admin/campaign-os/CallFlows"));
const CampaignsCallFlowDetail = lazy(() => import("@/pages/admin/campaign-os/CallFlowDetail"));
const CampaignOsReadiness = lazy(() => import("@/pages/admin/campaign-os/CampaignOsReadiness"));

export const AdminRoutes = (
  <>
    <Route
      path="/admin"
      element={
        <ProtectedRoute requiredRole="admin">
          <LazyRoute><Admin /></LazyRoute>
        </ProtectedRoute>
      }
    >
      <Route index element={<LazyRoute><AdminOverview /></LazyRoute>} />
      <Route path="leads" element={<LazyRoute><AdminLeads /></LazyRoute>} />
      <Route path="leads/:id" element={<LazyRoute><AdminLeadDetail /></LazyRoute>} />
      <Route path="clients" element={<LazyRoute><AdminClients /></LazyRoute>} />
      <Route path="crm" element={<LazyRoute><AdminCRM /></LazyRoute>} />
      <Route path="outbound-calls" element={<LazyRoute><AdminOutboundCalls /></LazyRoute>} />
      <Route path="tickets" element={<LazyRoute><AdminTickets /></LazyRoute>} />
      <Route path="tickets/:id" element={<LazyRoute><AdminTicketDetail /></LazyRoute>} />
      <Route path="billing" element={<LazyRoute><AdminBilling /></LazyRoute>} />
      <Route path="agents" element={<LazyRoute><AdminAgents /></LazyRoute>} />
      <Route path="users" element={<LazyRoute><AdminUsers /></LazyRoute>} />
      <Route path="users/supervisor-scope" element={<LazyRoute><SupervisorScopeManager /></LazyRoute>} />
      <Route path="partners" element={<LazyRoute><AdminPartners /></LazyRoute>} />
      <Route path="partners/:id" element={<LazyRoute><AdminPartnerDetail /></LazyRoute>} />
      <Route path="analytics" element={<LazyRoute><AdminAnalytics /></LazyRoute>} />
      <Route path="intelligence" element={<LazyRoute><AdminIntelligence /></LazyRoute>} />
      <Route path="analytics/dashboard-events" element={<LazyRoute><AdminDashboardEvents /></LazyRoute>} />
      <Route path="settings" element={<LazyRoute><AdminSettings /></LazyRoute>} />
      <Route path="settings/product-testing" element={<LazyRoute><AdminProductTesting /></LazyRoute>} />
      <Route path="support" element={<LazyRoute><AdminSupport /></LazyRoute>} />
      <Route path="blog" element={<LazyRoute><AdminBlog /></LazyRoute>} />
      <Route path="blog/editor" element={<LazyRoute><AdminBlogEditor /></LazyRoute>} />
      <Route path="blog/editor/:id" element={<LazyRoute><AdminBlogEditor /></LazyRoute>} />
      <Route path="keywords" element={<LazyRoute><AdminKeywords /></LazyRoute>} />
      <Route path="growth-hub" element={<LazyRoute><AdminGrowthHub /></LazyRoute>} />
      <Route path="growth-hub/social" element={<LazyRoute><AdminGrowthHubSocial /></LazyRoute>} />
      <Route path="growth-hub/reports" element={<LazyRoute><AdminGrowthHubReports /></LazyRoute>} />
      <Route path="growth-hub/newsletter" element={<LazyRoute><AdminGrowthHubNewsletter /></LazyRoute>} />
      <Route path="growth-hub/wordpress" element={<LazyRoute><AdminGrowthHubWordPress /></LazyRoute>} />
      <Route path="growth-hub/email" element={<LazyRoute><AdminGrowthHubEmail /></LazyRoute>} />
      <Route path="outline" element={<LazyRoute><Outline /></LazyRoute>} />
      <Route path="architecture" element={<LazyRoute><AdminArchitecture /></LazyRoute>} />
      <Route path="mission-control" element={<LazyRoute><AdminMissionControl /></LazyRoute>} />
      <Route path="launch-checklist" element={<LazyRoute><AdminLaunchChecklist /></LazyRoute>} />
      <Route path="audit-log" element={<LazyRoute><AdminAuditLog /></LazyRoute>} />
      <Route path="feedback" element={<LazyRoute><AdminFeedback /></LazyRoute>} />
      <Route path="launch-controls" element={<LazyRoute><AdminLaunchControls /></LazyRoute>} />
      <Route path="email-preview" element={<LazyRoute><EmailPreview /></LazyRoute>} />
      <Route path="wl-portals" element={<LazyRoute><WLClientsPortalList /></LazyRoute>} />
      <Route path="wl-leak-audit" element={<LazyRoute><AdminWLLeakAudit /></LazyRoute>} />
      <Route path="wl-health" element={<LazyRoute><AdminWLHealth /></LazyRoute>} />
      <Route path="wl-config-diff" element={<LazyRoute><AdminWLConfigDiff /></LazyRoute>} />
      <Route path="wl-preview/:partnerId" element={<LazyRoute><AdminWLPreview /></LazyRoute>} />
      <Route path="clients/:leadId/call-report" element={<LazyRoute><AdminClientCallReport /></LazyRoute>} />
      <Route path="fulfillment-intake" element={<LazyRoute><AdminFulfillmentIntake /></LazyRoute>} />
      <Route path="fulfillment-intake/:id" element={<LazyRoute><AdminFulfillmentIntakeDetail /></LazyRoute>} />
      <Route path="campaign-os" element={<LazyRoute><CampaignOsLayout /></LazyRoute>}>
        <Route index element={<LazyRoute><CampaignOsOverview /></LazyRoute>} />
        <Route path="clients" element={<LazyRoute><CampaignsClients /></LazyRoute>} />
        <Route path="clients/:clientId" element={<LazyRoute><CampaignsClientDetail /></LazyRoute>} />
        <Route path="clients/:clientId/locations/:locationId" element={<LazyRoute><CampaignsLocationDetail /></LazyRoute>} />
        <Route path="locations" element={<LazyRoute><CampaignsLocations /></LazyRoute>} />
        <Route path="call-flows" element={<LazyRoute><CampaignsCallFlows /></LazyRoute>} />
        <Route path="call-flows/:id" element={<LazyRoute><CampaignsCallFlowDetail /></LazyRoute>} />
        <Route path="departments" element={<LazyRoute><CampaignOsDepartments /></LazyRoute>} />
        <Route path="campaigns" element={<LazyRoute><CampaignOsCampaigns /></LazyRoute>} />
        <Route path="campaigns/:id" element={<LazyRoute><CampaignOsCampaignDetail /></LazyRoute>} />
        <Route path="campaigns/:id/script" element={<LazyRoute><CampaignOsScriptBuilder /></LazyRoute>} />
        <Route path="campaigns/:id/versions" element={<LazyRoute><CampaignVersions /></LazyRoute>} />
        <Route path="templates" element={<LazyRoute><CampaignTemplates /></LazyRoute>} />
        <Route path="fields" element={<LazyRoute><CampaignOsFields /></LazyRoute>} />
        <Route path="faqs" element={<LazyRoute><CampaignOsFaqs /></LazyRoute>} />
        <Route path="policies" element={<LazyRoute><CampaignOsPolicies /></LazyRoute>} />
        <Route path="five9" element={<LazyRoute><CampaignOsFive9 /></LazyRoute>} />
        <Route path="defaults" element={<LazyRoute><CampaignOsDefaults /></LazyRoute>} />
        <Route path="drafts" element={<LazyRoute><CampaignOsDrafts /></LazyRoute>} />
        <Route path="reporting" element={<LazyRoute><CampaignOsReporting /></LazyRoute>} />
        <Route path="readiness" element={<LazyRoute><CampaignOsReadiness /></LazyRoute>} />
      </Route>
      {/*
        CANONICAL: /admin/campaign-os/* (above) is the source of truth for Campaigns
        routes. The /admin/campaigns/* alias below is a backward-compat shortcut that
        mounts the same layout for a partial subset of children (no /reporting, no
        /templates, no /campaigns/:id/versions, no /clients/:clientId/locations/:locationId
        nesting). Add new Campaigns routes to /admin/campaign-os ONLY. Do not extend
        the alias. Plan to retire the alias once all internal links use the canonical path.
      */}
      <Route path="campaigns" element={<LazyRoute><CampaignOsLayout /></LazyRoute>}>
        <Route index element={<LazyRoute><CampaignOsOverview /></LazyRoute>} />
        <Route path="clients" element={<LazyRoute><CampaignsClients /></LazyRoute>} />
        <Route path="clients/:clientId" element={<LazyRoute><CampaignsClientDetail /></LazyRoute>} />
        <Route path="clients/:clientId/locations/:locationId" element={<LazyRoute><CampaignsLocationDetail /></LazyRoute>} />
        <Route path="locations" element={<LazyRoute><CampaignsLocations /></LazyRoute>} />
        <Route path="call-flows" element={<LazyRoute><CampaignsCallFlows /></LazyRoute>} />
        <Route path="call-flows/:id" element={<LazyRoute><CampaignsCallFlowDetail /></LazyRoute>} />
        <Route path="campaigns" element={<LazyRoute><CampaignOsCampaigns /></LazyRoute>} />
        <Route path="campaigns/:id" element={<LazyRoute><CampaignOsCampaignDetail /></LazyRoute>} />
        <Route path="campaigns/:id/script" element={<LazyRoute><CampaignOsScriptBuilder /></LazyRoute>} />
        <Route path="fields" element={<LazyRoute><CampaignOsFields /></LazyRoute>} />
        <Route path="faqs" element={<LazyRoute><CampaignOsFaqs /></LazyRoute>} />
        <Route path="policies" element={<LazyRoute><CampaignOsPolicies /></LazyRoute>} />
        <Route path="five9" element={<LazyRoute><CampaignOsFive9 /></LazyRoute>} />
        <Route path="defaults" element={<LazyRoute><CampaignOsDefaults /></LazyRoute>} />
        <Route path="drafts" element={<LazyRoute><CampaignOsDrafts /></LazyRoute>} />
      </Route>
      <Route path="discoverability" element={<LazyRoute><DiscoverabilityLayout /></LazyRoute>}>
        <Route index element={<LazyRoute><DiscoverabilityOverview /></LazyRoute>} />
        <Route path="templates" element={<LazyRoute><DiscSections.TemplatesSection /></LazyRoute>} />
        <Route path="locations" element={<LazyRoute><DiscSections.LocationsSection /></LazyRoute>} />
        <Route path="keywords" element={<LazyRoute><DiscSections.KeywordsSection /></LazyRoute>} />
        <Route path="audiences" element={<LazyRoute><DiscSections.AudiencesSection /></LazyRoute>} />
        <Route path="faqs" element={<LazyRoute><DiscSections.FaqLibrarySection /></LazyRoute>} />
        <Route path="links" element={<LazyRoute><DiscSections.InternalLinksSection /></LazyRoute>} />
        <Route path="pages" element={<LazyRoute><DiscSections.GeneratedPagesSection /></LazyRoute>} />
        <Route path="queue" element={<LazyRoute><DiscSections.PublishQueueSection /></LazyRoute>} />
        <Route path="review" element={<LazyRoute><DiscSections.QualityReviewSection /></LazyRoute>} />
        <Route path="sitemap" element={<LazyRoute><DiscSections.SitemapControlsSection /></LazyRoute>} />
      </Route>
    </Route>

    {/* Legacy redirect: /wl-clients moved under /admin/wl-portals */}
    <Route path="/wl-clients" element={<Navigate to="/admin/wl-portals" replace />} />
  </>
);
