import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";

// Sales
const SalesDashboard = lazy(() => import("@/pages/staff/SalesDashboard"));
const SalesMeetings = lazy(() => import("@/pages/staff/SalesMeetings"));
const SalesLeads = lazy(() => import("@/pages/staff/SalesLeads"));
const SalesPipeline = lazy(() => import("@/pages/staff/SalesPipeline"));
const SalesProposals = lazy(() => import("@/pages/staff/SalesProposals"));
const SalesPerformance = lazy(() => import("@/pages/staff/SalesPerformance"));
const StaffLeadDetail = lazy(() => import("@/pages/staff/StaffLeadDetail"));
const SalesTickets = lazy(() => import("@/pages/staff/SalesTickets"));

// Agent
const AgentDashboard = lazy(() => import("@/pages/staff/AgentDashboard"));
const AgentWorkspace = lazy(() => import("@/pages/staff/AgentWorkspace"));
const AgentClients = lazy(() => import("@/pages/staff/AgentClients"));
const AgentCallLogs = lazy(() => import("@/pages/staff/AgentCallLogs"));
const AgentTasks = lazy(() => import("@/pages/staff/AgentTasks"));
const AgentTickets = lazy(() => import("@/pages/staff/AgentTickets"));
const AgentOnboarding = lazy(() => import("@/pages/staff/AgentOnboarding"));
const AgentOutboundCalls = lazy(() => import("@/pages/staff/AgentOutboundCalls"));
const AgentShifts = lazy(() => import("@/pages/staff/AgentShifts"));
const AgentSchedule = lazy(() => import("@/pages/staff/AgentSchedule"));
const AgentMessages = lazy(() => import("@/pages/staff/AgentMessages"));
const AgentScripts = lazy(() => import("@/pages/staff/AgentScripts"));
const AgentTimeOff = lazy(() => import("@/pages/staff/AgentTimeOff"));
const AgentMyProfile = lazy(() => import("@/pages/staff/AgentMyProfile"));
const AgentCampaigns = lazy(() => import("@/pages/staff/AgentCampaigns"));
const AgentTraining = lazy(() => import("@/pages/staff/AgentTraining"));

// Supervisor
const SupervisorDashboard = lazy(() => import("@/pages/staff/SupervisorDashboard"));
const SupervisorWorkspace = lazy(() => import("@/pages/staff/SupervisorWorkspace"));
const SupervisorSchedule = lazy(() => import("@/pages/staff/SupervisorSchedule"));
const SupervisorAgents = lazy(() => import("@/pages/staff/SupervisorAgents"));
const SupervisorTasks = lazy(() => import("@/pages/staff/SupervisorTasks"));
const SupervisorTickets = lazy(() => import("@/pages/staff/SupervisorTickets"));
const SupervisorOutboundCalls = lazy(() => import("@/pages/staff/SupervisorOutboundCalls"));
const SupervisorShiftReviews = lazy(() => import("@/pages/staff/SupervisorShiftReviews"));
const SupervisorScriptReviews = lazy(() => import("@/pages/staff/SupervisorScriptReviews"));
const SupervisorAgentOnboarding = lazy(() => import("@/pages/staff/SupervisorAgentOnboarding"));
const SupervisorClientAssignments = lazy(() => import("@/pages/staff/SupervisorClientAssignments"));
const SupervisorPerformance = lazy(() => import("@/pages/staff/SupervisorPerformance"));
const SupervisorEscalations = lazy(() => import("@/pages/staff/SupervisorEscalations"));
const SupervisorMessages = lazy(() => import("@/pages/staff/SupervisorMessages"));
const SupervisorFulfillment = lazy(() => import("@/pages/staff/SupervisorFulfillment"));
const SupervisorFulfillmentDetail = lazy(() => import("@/pages/staff/SupervisorFulfillmentDetail"));
const SupervisorTrainingSignoffs = lazy(() => import("@/pages/staff/SupervisorTrainingSignoffs"));

// Billing
const BillingDashboard = lazy(() => import("@/pages/staff/BillingDashboard"));
const BillingTickets = lazy(() => import("@/pages/staff/BillingTickets"));
const BillingPayouts = lazy(() => import("@/pages/staff/BillingPayouts"));
const BillingSubscriptions = lazy(() => import("@/pages/staff/BillingSubscriptions"));
const BillingPaymentIssues = lazy(() => import("@/pages/staff/BillingPaymentIssues"));
const BillingCommissions = lazy(() => import("@/pages/staff/BillingCommissions"));
const BillingClientLookup = lazy(() => import("@/pages/staff/BillingClientLookup"));
const BillingWLPartners = lazy(() => import("@/pages/staff/BillingWLPartners"));

// Tech
const TechDashboard = lazy(() => import("@/pages/staff/TechDashboard"));
const TechTickets = lazy(() => import("@/pages/staff/TechTickets"));
const TechSystemIssues = lazy(() => import("@/pages/staff/TechSystemIssues"));
const TechKnowledgeBase = lazy(() => import("@/pages/staff/TechKnowledgeBase"));
const TechChatDeployments = lazy(() => import("@/pages/staff/TechChatDeployments"));
const TechChatDeploymentDetail = lazy(() => import("@/pages/staff/TechChatDeploymentDetail"));

// Shared
const StaffTicketDetail = lazy(() => import("@/pages/staff/StaffTicketDetail"));
const StaffSettings = lazy(() => import("@/pages/staff/StaffSettings"));
const StaffSupport = lazy(() => import("@/pages/staff/StaffSupport"));
const StaffFeedback = lazy(() => import("@/pages/staff/StaffFeedback"));

type Role = "sales" | "agent" | "supervisor" | "billing" | "tech";
const guard = (role: Role, el: React.ReactNode) => (
  <ProtectedRoute requiredRole={role}><LazyRoute>{el}</LazyRoute></ProtectedRoute>
);

export const StaffRoutes = (
  <>
    {/* Sales */}
    <Route path="/staff/sales" element={guard("sales", <SalesDashboard />)} />
    <Route path="/staff/sales/leads" element={guard("sales", <SalesLeads />)} />
    <Route path="/staff/sales/leads/:id" element={guard("sales", <StaffLeadDetail />)} />
    <Route path="/staff/sales/pipeline" element={guard("sales", <SalesPipeline />)} />
    <Route path="/staff/sales/proposals" element={guard("sales", <SalesProposals />)} />
    <Route path="/staff/sales/performance" element={guard("sales", <SalesPerformance />)} />
    <Route path="/staff/sales/tickets" element={guard("sales", <SalesTickets />)} />
    <Route path="/staff/sales/tickets/:id" element={guard("sales", <StaffTicketDetail role="sales" />)} />
    <Route path="/staff/sales/meetings" element={guard("sales", <SalesMeetings />)} />
    <Route path="/staff/sales/settings" element={guard("sales", <StaffSettings />)} />
    <Route path="/staff/sales/support" element={guard("sales", <StaffSupport role="sales" />)} />
    <Route path="/staff/sales/feedback" element={guard("sales", <StaffFeedback role="sales" />)} />

    {/* Agent */}
    <Route path="/staff/agent" element={guard("agent", <AgentDashboard />)} />
    <Route path="/staff/agent/workspace" element={guard("agent", <AgentWorkspace />)} />
    <Route path="/staff/agent/clients" element={guard("agent", <AgentClients />)} />
    <Route path="/staff/agent/calls" element={guard("agent", <AgentCallLogs />)} />
    <Route path="/staff/agent/tasks" element={guard("agent", <AgentTasks />)} />
    <Route path="/staff/agent/tickets" element={guard("agent", <AgentTickets />)} />
    <Route path="/staff/agent/tickets/:id" element={guard("agent", <StaffTicketDetail role="agent" />)} />
    <Route path="/staff/agent/onboarding" element={guard("agent", <AgentOnboarding />)} />
    <Route path="/staff/agent/outbound-calls" element={guard("agent", <AgentOutboundCalls />)} />
    <Route path="/staff/agent/shifts" element={guard("agent", <AgentShifts />)} />
    <Route path="/staff/agent/schedule" element={guard("agent", <AgentSchedule />)} />
    <Route path="/staff/agent/messages" element={guard("agent", <AgentMessages />)} />
    <Route path="/staff/agent/scripts" element={guard("agent", <AgentScripts />)} />
    <Route path="/staff/agent/time-off" element={guard("agent", <AgentTimeOff />)} />
    <Route path="/staff/agent/my-profile" element={guard("agent", <AgentMyProfile />)} />
    <Route path="/staff/agent/campaigns" element={guard("agent", <AgentCampaigns />)} />
    <Route path="/staff/agent/training" element={guard("agent", <AgentTraining />)} />
    <Route path="/staff/agent/settings" element={guard("agent", <StaffSettings />)} />
    <Route path="/staff/agent/support" element={guard("agent", <StaffSupport role="agent" />)} />
    <Route path="/staff/agent/feedback" element={guard("agent", <StaffFeedback role="agent" />)} />

    {/* Supervisor */}
    <Route path="/staff/supervisor" element={guard("supervisor", <SupervisorDashboard />)} />
    <Route path="/staff/supervisor/workspace" element={guard("supervisor", <SupervisorWorkspace />)} />
    <Route path="/staff/supervisor/agents" element={guard("supervisor", <SupervisorAgents />)} />
    <Route path="/staff/supervisor/tasks" element={guard("supervisor", <SupervisorTasks />)} />
    <Route path="/staff/supervisor/schedule" element={guard("supervisor", <SupervisorSchedule />)} />
    <Route path="/staff/supervisor/messages" element={guard("supervisor", <SupervisorMessages />)} />
    <Route path="/staff/supervisor/outbound-calls" element={guard("supervisor", <SupervisorOutboundCalls />)} />
    <Route path="/staff/supervisor/tickets" element={guard("supervisor", <SupervisorTickets />)} />
    <Route path="/staff/supervisor/tickets/:id" element={guard("supervisor", <StaffTicketDetail role="supervisor" />)} />
    <Route path="/staff/supervisor/shift-reviews" element={guard("supervisor", <SupervisorShiftReviews />)} />
    <Route path="/staff/supervisor/script-reviews" element={guard("supervisor", <SupervisorScriptReviews />)} />
    <Route path="/staff/supervisor/agent-onboarding" element={guard("supervisor", <SupervisorAgentOnboarding />)} />
    <Route path="/staff/supervisor/client-assignments" element={guard("supervisor", <SupervisorClientAssignments />)} />
    <Route path="/staff/supervisor/performance" element={guard("supervisor", <SupervisorPerformance />)} />
    <Route path="/staff/supervisor/escalations" element={guard("supervisor", <SupervisorEscalations />)} />
    <Route path="/staff/supervisor/fulfillment" element={guard("supervisor", <SupervisorFulfillment />)} />
    <Route path="/staff/supervisor/fulfillment/:id" element={guard("supervisor", <SupervisorFulfillmentDetail />)} />
    <Route path="/staff/supervisor/training-signoffs" element={guard("supervisor", <SupervisorTrainingSignoffs />)} />
    <Route path="/staff/supervisor/settings" element={guard("supervisor", <StaffSettings />)} />
    <Route path="/staff/supervisor/support" element={guard("supervisor", <StaffSupport role="supervisor" />)} />
    <Route path="/staff/supervisor/feedback" element={guard("supervisor", <StaffFeedback role="supervisor" />)} />

    {/* Billing */}
    <Route path="/staff/billing" element={guard("billing", <BillingDashboard />)} />
    <Route path="/staff/billing/tickets" element={guard("billing", <BillingTickets />)} />
    <Route path="/staff/billing/tickets/:id" element={guard("billing", <StaffTicketDetail role="billing" />)} />
    <Route path="/staff/billing/subscriptions" element={guard("billing", <BillingSubscriptions />)} />
    <Route path="/staff/billing/payment-issues" element={guard("billing", <BillingPaymentIssues />)} />
    <Route path="/staff/billing/invoices" element={guard("billing", <BillingPayouts />)} />
    <Route path="/staff/billing/commissions" element={guard("billing", <BillingCommissions />)} />
    <Route path="/staff/billing/client-lookup" element={guard("billing", <BillingClientLookup />)} />
    <Route path="/staff/billing/wl-partners" element={guard("billing", <BillingWLPartners />)} />
    <Route path="/staff/billing/settings" element={guard("billing", <StaffSettings />)} />
    <Route path="/staff/billing/support" element={guard("billing", <StaffSupport role="billing" />)} />
    <Route path="/staff/billing/feedback" element={guard("billing", <StaffFeedback role="billing" />)} />

    {/* Tech */}
    <Route path="/staff/tech" element={guard("tech", <TechDashboard />)} />
    <Route path="/staff/tech/tickets" element={guard("tech", <TechTickets />)} />
    <Route path="/staff/tech/tickets/:id" element={guard("tech", <StaffTicketDetail role="tech" />)} />
    <Route path="/staff/tech/issues" element={guard("tech", <TechSystemIssues />)} />
    <Route path="/staff/tech/knowledge-base" element={guard("tech", <TechKnowledgeBase />)} />
    <Route path="/staff/tech/chat-deployments" element={guard("tech", <TechChatDeployments />)} />
    <Route path="/staff/tech/chat-deployments/:id" element={guard("tech", <TechChatDeploymentDetail />)} />
    <Route path="/staff/tech/settings" element={guard("tech", <StaffSettings />)} />
    <Route path="/staff/tech/support" element={guard("tech", <StaffSupport role="tech" />)} />
    <Route path="/staff/tech/feedback" element={guard("tech", <StaffFeedback role="tech" />)} />
  </>
);
