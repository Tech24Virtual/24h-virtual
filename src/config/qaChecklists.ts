/**
 * Guided QA checklists per Product Testing segment.
 *
 * Each entry is an ordered list of small, concrete steps the tester should
 * perform inside the live segment, in sequence. Steps describe what to click
 * or verify and an optional `expect` line for the success signal.
 *
 * If a segment has no entry, `getChecklistFor()` falls back to DEFAULT_STEPS
 * so the guided overlay is always available.
 */

export interface QAChecklistStep {
  id: string;
  label: string;
  expect?: string;
}

export const DEFAULT_STEPS: QAChecklistStep[] = [
  { id: 'load', label: 'Page loads without errors', expect: 'No red console errors and no 4xx/5xx in network panel' },
  { id: 'no-blank', label: 'Primary content is visible', expect: 'No blank screen, no infinite skeleton, no obvious empty state on production-backed segments' },
  { id: 'nav', label: 'Sidebar/top navigation is correct for this role', expect: 'Items match the persona; no broken links' },
  { id: 'tabs', label: 'Click each visible tab in order', expect: 'Each tab swaps content and does not throw' },
  { id: 'cta', label: 'Try the primary CTA', expect: 'Action either completes, opens a real flow, or shows a real form (not a toast-only stub)' },
  { id: 'back', label: 'Use browser back, then return', expect: 'State restores, no remount errors' },
];

export const QA_CHECKLISTS: Record<string, QAChecklistStep[]> = {
  // ============== DASHBOARDS ==============
  'superadmin-dashboard': [
    { id: 'kpis', label: 'Verify KPI cards render with numbers (not NaN)', expect: 'Lead count, client count, revenue tile populated' },
    { id: 'pipeline', label: 'Pipeline summary loads', expect: 'No empty/loading state hangs >3s' },
    { id: 'tab-overview', label: 'Click Overview tab' },
    { id: 'tab-system', label: 'Click any System / Mission Control link in the sidebar', expect: 'Routes to /admin/mission-control without 404' },
    { id: 'launch-button', label: 'Click "Launch Checklist" or equivalent CTA', expect: 'Routes to /admin/launch-checklist' },
  ],
  'admin-dashboard': [
    { id: 'kpis', label: 'KPI tiles render', expect: 'Numbers, not "NaN" or "—"' },
    { id: 'recent', label: 'Recent activity feed populates' },
    { id: 'leads-link', label: 'Click "Leads" in sidebar', expect: 'Lands on /admin/leads' },
    { id: 'clients-link', label: 'Click "Clients" in sidebar', expect: 'Lands on /admin/clients' },
  ],
  'client-dashboard': [
    { id: 'hero', label: 'Personalized hero / welcome card renders' },
    { id: 'tab-calls', label: 'Click "Call Logs" tab/route' },
    { id: 'tab-campaigns', label: 'Click "Campaigns"' },
    { id: 'tab-schedule', label: 'Click "Schedule"' },
    { id: 'tab-billing', label: 'Click "Billing"' },
    { id: 'tab-support', label: 'Click "Support"' },
    { id: 'cta-outbound', label: 'Click "Request Outbound Call" CTA', expect: 'Opens a real form, not a toast' },
  ],
  'wl-partner-dashboard': [
    { id: 'branding', label: 'Partner branding (logo/colors) applied' },
    { id: 'tab-leads', label: 'Open Leads tab' },
    { id: 'tab-proposals', label: 'Open Proposals tab' },
    { id: 'tab-billing', label: 'Open Billing tab', expect: 'Shows real revenue numbers, not zeros' },
    { id: 'cta-add-client', label: 'Click "Add Client" CTA', expect: 'Opens fulfillment intake form' },
  ],
  'agent-dashboard': [
    { id: 'shift', label: 'Shift timer/state visible at top' },
    { id: 'queue', label: 'Work queue / assigned tasks list renders' },
    { id: 'tab-tickets', label: 'Open Tickets tab' },
    { id: 'tab-shifts', label: 'Open Shifts/Schedule' },
  ],
  'supervisor-dashboard': [
    { id: 'team', label: 'Team roster / agent availability loads' },
    { id: 'sla', label: 'SLA / response-time widget populates' },
    { id: 'tab-reviews', label: 'Open Performance Reviews' },
    { id: 'tab-signoffs', label: 'Open Training Signoffs', expect: 'Routes to /staff/supervisor/training-signoffs' },
  ],

  // ============== ONBOARDING ==============
  'get-started-wizard': [
    { id: 'step1', label: 'Complete Step 1 (industry selection)' },
    { id: 'step2', label: 'Complete Step 2' },
    { id: 'step3', label: 'Complete Step 3 (slot machine carousel renders without freezing)' },
    { id: 'step4', label: 'Complete Step 4' },
    { id: 'step5', label: 'Complete Step 5' },
    { id: 'finish', label: 'Submit final step', expect: 'Confirmation screen + recommendations shown' },
    { id: 'back-nav', label: 'Use Back button on any step', expect: 'Prior selections retained' },
  ],
  'agent-onboarding': [
    { id: 'profile', label: 'Profile setup form loads' },
    { id: 'training', label: 'Training modules list visible' },
    { id: 'consent', label: 'Consent / agreement checkbox works' },
  ],
  'launch-checklist': [
    { id: 'items', label: 'All checklist items render' },
    { id: 'check', label: 'Toggle one item to checked', expect: 'Persists on reload' },
    { id: 'gate', label: 'Verify "ready to launch" gate reflects completion %' },
  ],

  // ============== PRODUCT / SOLUTION ==============
  'campaigns': [
    { id: 'list', label: 'Campaigns table loads' },
    { id: 'open', label: 'Click into one campaign', expect: 'Routes to /admin/campaign-os/campaigns/:id and detail renders' },
    { id: 'tab-script', label: 'Click "Script Builder" tab/CTA', expect: 'Opens script tree editor' },
    { id: 'tab-versions', label: 'Click "Versions"' },
    { id: 'cta-publish', label: 'Try Publish (or Save Draft)', expect: 'Real RPC fires; not a toast-only stub' },
  ],
  'crm-leads': [
    { id: 'list', label: 'Leads list renders with filters' },
    { id: 'filter', label: 'Apply a filter (status, source, date)' },
    { id: 'open', label: 'Open one lead', expect: 'Detail page loads with activity timeline' },
    { id: 'cta-status', label: 'Change status via dropdown', expect: 'Update persists on reload' },
  ],
  'active-accounts': [
    { id: 'list', label: 'Clients list loads' },
    { id: 'open', label: 'Open one client', expect: 'Detail page renders' },
    { id: 'tab-locations', label: 'Open Locations tab' },
    { id: 'tab-departments', label: 'Open Departments tab' },
  ],
  'support-tickets': [
    { id: 'queue', label: 'Ticket queue loads' },
    { id: 'filter-dept', label: 'Filter by department' },
    { id: 'open', label: 'Open one ticket', expect: 'Threaded chat view loads' },
    { id: 'reply', label: 'Send a test reply', expect: 'Reply appears in thread without errors' },
  ],
  'billing': [
    { id: 'invoices', label: 'Invoices list loads' },
    { id: 'tab-payouts', label: 'Open Payouts tab' },
    { id: 'tab-subs', label: 'Open Subscriptions tab' },
    { id: 'open-invoice', label: 'Open one invoice', expect: 'Line items render' },
  ],
  'outline': [
    { id: 'phases', label: 'All phases (A through H) render' },
    { id: 'wave-status', label: 'Wave status badges accurate (Wave 1+2 closed, Wave 3 active)' },
    { id: 'expand', label: 'Expand one phase to see items' },
  ],
  'script-builder': [
    { id: 'campaign', label: 'Open a campaign first, then click Script Builder' },
    { id: 'tree', label: 'Script tree renders root + children' },
    { id: 'add-node', label: 'Add a new node' },
    { id: 'validate', label: 'Run Validate', expect: 'Reports any orphan nodes' },
    { id: 'save', label: 'Save draft', expect: 'No errors, version increments' },
  ],
};

export function getChecklistFor(segmentId: string | null | undefined): QAChecklistStep[] {
  if (!segmentId) return DEFAULT_STEPS;
  return QA_CHECKLISTS[segmentId] ?? DEFAULT_STEPS;
}
