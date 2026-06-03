import { MOCK_AGENTS, daysAgo, hoursAgo } from './people';

export interface MockScriptReview {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  description: string;
  request_type: 'add_faq' | 'edit_faq' | 'edit_greeting' | 'edit_close' | 'add_script' | 'other';
  status: 'pending' | 'in_review' | 'needs_info' | 'approved' | 'rejected';
  source: 'agent' | 'client' | 'supervisor';
  created_at: string;
}

export const MOCK_SCRIPT_REVIEWS: MockScriptReview[] = [
  {
    id: 'scr-001',
    client_id: '00000000-0000-4000-a000-000000000101',
    client_name: 'Riverside Dental',
    title: 'Add FAQ for new fluoride sealant procedure',
    description:
      'Patients are asking about the new sealant procedure and our current script doesn\'t cover pricing or recovery time. Proposing: "Q: How much does the sealant cost? A: It runs $145 per quadrant, covered by most PPOs. Recovery is immediate."',
    request_type: 'add_faq',
    status: 'pending',
    source: 'agent',
    created_at: hoursAgo(4),
  },
  {
    id: 'scr-002',
    client_id: '00000000-0000-4000-a000-000000000102',
    client_name: 'Hampton Legal Group',
    title: 'Update intake disclaimer language for probate cases',
    description:
      'Counsel requested change to intake disclaimer to comply with updated NY State Bar guidance (effective May 1). New language attached.',
    request_type: 'edit_greeting',
    status: 'in_review',
    source: 'client',
    created_at: daysAgo(1),
  },
];

export interface MockShiftInvoice {
  id: string;
  agent_id: string;
  agent_name: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  net_hours: number;
  total_break_minutes: number;
  status: 'submitted' | 'approved' | 'rejected' | 'paid';
  agent_notes: string | null;
  submitted_at: string;
  payout_date: string | null;
}

export const MOCK_SHIFT_INVOICES: MockShiftInvoice[] = [
  {
    id: 'sin-001',
    agent_id: MOCK_AGENTS[0].id,
    agent_name: MOCK_AGENTS[0].full_name,
    period_start: '2025-04-01',
    period_end: '2025-04-15',
    total_hours: 82.0,
    net_hours: 78.5,
    total_break_minutes: 210,
    status: 'submitted',
    agent_notes: 'Standard cycle. No PTO taken.',
    submitted_at: hoursAgo(28),
    payout_date: null,
  },
  {
    id: 'sin-002',
    agent_id: MOCK_AGENTS[2].id,
    agent_name: MOCK_AGENTS[2].full_name,
    period_start: '2025-04-01',
    period_end: '2025-04-15',
    total_hours: 86.5,
    net_hours: 82.0,
    total_break_minutes: 270,
    status: 'submitted',
    agent_notes: 'Picked up extra Saturday shift on April 12.',
    submitted_at: hoursAgo(26),
    payout_date: null,
  },
  {
    id: 'sin-003',
    agent_id: MOCK_AGENTS[3].id,
    agent_name: MOCK_AGENTS[3].full_name,
    period_start: '2025-04-01',
    period_end: '2025-04-15',
    total_hours: 75.5,
    net_hours: 71.5,
    total_break_minutes: 240,
    status: 'submitted',
    agent_notes: 'Apologies on the 3 late clock-ins — child care issue, resolving.',
    submitted_at: hoursAgo(24),
    payout_date: null,
  },
];

export interface MockPerformanceReview {
  id: string;
  agent_id: string;
  agent_name: string;
  period_start: string;
  period_end: string;
  overall_score: number;
  quality_score: number;
  attendance_score: number;
  communication_score: number;
  status: 'draft' | 'published';
  strengths: string | null;
  areas_for_improvement: string | null;
  notes: string | null;
  created_at: string;
}

export const MOCK_PERF_REVIEWS: MockPerformanceReview[] = [
  {
    id: 'prf-001',
    agent_id: MOCK_AGENTS[0].id,
    agent_name: MOCK_AGENTS[0].full_name,
    period_start: '2025-01-01',
    period_end: '2025-03-31',
    overall_score: 4.6,
    quality_score: 5,
    attendance_score: 5,
    communication_score: 4,
    status: 'published',
    strengths: 'Exceptional emergency triage handling. Caller satisfaction surveys consistently 4.8+.',
    areas_for_improvement: 'Slightly verbose in chat replies; coach toward concise close phrases.',
    notes: 'On track for senior agent promotion in Q3.',
    created_at: daysAgo(7),
  },
  {
    id: 'prf-002',
    agent_id: MOCK_AGENTS[1].id,
    agent_name: MOCK_AGENTS[1].full_name,
    period_start: '2025-01-01',
    period_end: '2025-03-31',
    overall_score: 4.2,
    quality_score: 4,
    attendance_score: 5,
    communication_score: 4,
    status: 'published',
    strengths: 'Reliable, calm under pressure, strong with WL portal partners.',
    areas_for_improvement: 'Lean into outbound dialing; current ratio is 60/40 inbound-heavy.',
    notes: null,
    created_at: daysAgo(7),
  },
  {
    id: 'prf-003',
    agent_id: MOCK_AGENTS[2].id,
    agent_name: MOCK_AGENTS[2].full_name,
    period_start: '2025-01-01',
    period_end: '2025-03-31',
    overall_score: 4.8,
    quality_score: 5,
    attendance_score: 5,
    communication_score: 5,
    status: 'published',
    strengths: 'Top performer — fastest avg handle time, highest CSAT.',
    areas_for_improvement: 'Mentor newer agents on triage flow.',
    notes: 'Ready for team-lead consideration.',
    created_at: daysAgo(7),
  },
  {
    id: 'prf-004',
    agent_id: MOCK_AGENTS[5].id,
    agent_name: MOCK_AGENTS[5].full_name,
    period_start: '2025-01-01',
    period_end: '2025-03-31',
    overall_score: 4.5,
    quality_score: 5,
    attendance_score: 4,
    communication_score: 4,
    status: 'published',
    strengths: 'Excellent script discipline, very few escalations.',
    areas_for_improvement: 'One unexplained absence in February; otherwise solid.',
    notes: null,
    created_at: daysAgo(7),
  },
  {
    id: 'prf-005',
    agent_id: MOCK_AGENTS[4].id,
    agent_name: MOCK_AGENTS[4].full_name,
    period_start: '2025-01-01',
    period_end: '2025-03-31',
    overall_score: 4.0,
    quality_score: 4,
    attendance_score: 4,
    communication_score: 4,
    status: 'draft',
    strengths: 'New hire — adapting quickly, strong empathy in caller interactions.',
    areas_for_improvement: 'Continue ramp on WL partner workflows.',
    notes: 'Draft pending final coaching session before publish.',
    created_at: daysAgo(2),
  },
];
