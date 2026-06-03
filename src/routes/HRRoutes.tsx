import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LazyRoute } from "./LazyRoute";

const HRDashboard = lazy(() => import("@/pages/hr/HRDashboard"));
const HRDirectory = lazy(() => import("@/pages/hr/HRDirectory"));
const HROnboarding = lazy(() => import("@/pages/hr/HROnboarding"));
const HROffboarding = lazy(() => import("@/pages/hr/HROffboarding"));
const HRPayroll = lazy(() => import("@/pages/hr/HRPayroll"));
const HRTimeOff = lazy(() => import("@/pages/hr/HRTimeOff"));
const HRJobs = lazy(() => import("@/pages/hr/HRJobs"));
const HRContracts = lazy(() => import("@/pages/hr/HRContracts"));
const HRCommunications = lazy(() => import("@/pages/hr/HRCommunications"));
const HRTickets = lazy(() => import("@/pages/hr/HRTickets"));
const HRTicketDetail = lazy(() => import("@/pages/hr/HRTicketDetail"));
const HRSupport = lazy(() => import("@/pages/hr/HRSupport"));
const HRSettings = lazy(() => import("@/pages/hr/HRSettings"));

const guard = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="hr"><LazyRoute>{el}</LazyRoute></ProtectedRoute>
);

export const HRRoutes = (
  <>
    <Route path="/hr-portal" element={guard(<HRDashboard />)} />
    <Route path="/hr-portal/people/directory" element={guard(<HRDirectory />)} />
    <Route path="/hr-portal/people/onboarding" element={guard(<HROnboarding />)} />
    <Route path="/hr-portal/people/offboarding" element={guard(<HROffboarding />)} />
    <Route path="/hr-portal/payroll" element={guard(<HRPayroll />)} />
    <Route path="/hr-portal/payroll/time-off" element={guard(<HRTimeOff />)} />
    <Route path="/hr-portal/hiring/jobs" element={guard(<HRJobs />)} />
    <Route path="/hr-portal/hiring/contracts" element={guard(<HRContracts />)} />
    <Route path="/hr-portal/communications" element={guard(<HRCommunications />)} />
    <Route path="/hr-portal/tickets" element={guard(<HRTickets />)} />
    <Route path="/hr-portal/tickets/:id" element={guard(<HRTicketDetail />)} />
    <Route path="/hr-portal/support" element={guard(<HRSupport />)} />
    <Route path="/hr-portal/settings" element={guard(<HRSettings />)} />
    {/* Legacy redirects */}
    <Route path="/applicant-portal" element={<Navigate to="/hr-portal" replace />} />
    <Route path="/hr-portal/directory" element={<Navigate to="/hr-portal/people/directory" replace />} />
    <Route path="/hr-portal/onboarding" element={<Navigate to="/hr-portal/people/onboarding" replace />} />
    <Route path="/hr-portal/offboarding" element={<Navigate to="/hr-portal/people/offboarding" replace />} />
    <Route path="/hr-portal/time-off" element={<Navigate to="/hr-portal/payroll/time-off" replace />} />
    <Route path="/hr-portal/jobs" element={<Navigate to="/hr-portal/hiring/jobs" replace />} />
    <Route path="/hr-portal/contracts" element={<Navigate to="/hr-portal/hiring/contracts" replace />} />
  </>
);
