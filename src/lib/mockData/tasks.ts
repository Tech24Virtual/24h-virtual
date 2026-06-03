import { MOCK_AGENT_ID, MOCK_AGENTS, hoursAgo, minutesAgo, minutesFromNow } from './people';

export interface MockTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  visibility: 'self' | 'team';
  lead?: { name: string; company: string | null } | null;
}

export const MOCK_AGENT_TASKS: MockTask[] = [
  {
    id: 'tsk-a1',
    title: 'Send probate intake form to Frank Delaney',
    description: 'Email client intake docs (probate v2). Linked to ticket #4821.',
    priority: 'high',
    status: 'pending',
    due_date: minutesFromNow(120),
    created_at: hoursAgo(3),
    completed_at: null,
    assigned_to: MOCK_AGENT_ID,
    created_by: MOCK_AGENT_ID,
    visibility: 'self',
    lead: { name: 'Frank Delaney', company: 'Hampton Legal Group' },
  },
  {
    id: 'tsk-a2',
    title: 'Confirm Vista HVAC technician ETA with caller',
    description: 'Olivia Nguyen waiting — 95°F, elderly resident. Call back ASAP.',
    priority: 'urgent',
    status: 'pending',
    due_date: minutesAgo(22),
    created_at: hoursAgo(1),
    completed_at: null,
    assigned_to: MOCK_AGENT_ID,
    created_by: MOCK_AGENT_ID,
    visibility: 'self',
    lead: { name: 'Olivia Nguyen', company: 'Vista HVAC' },
  },
  {
    id: 'tsk-a3',
    title: 'Update Cedar Veterinary FAQ snippet',
    description: 'Add "exotic animal" handling note based on recent caller question.',
    priority: 'medium',
    status: 'pending',
    due_date: null,
    created_at: hoursAgo(6),
    completed_at: null,
    assigned_to: MOCK_AGENT_ID,
    created_by: MOCK_AGENT_ID,
    visibility: 'self',
    lead: { name: 'Cedar Veterinary', company: null },
  },
];

export const MOCK_SUPERVISOR_TASKS: MockTask[] = [
  {
    id: 'tsk-s1',
    title: 'Review BrightVoice partner overage dispute documentation',
    description: 'Pull last 30 days of call logs and reconcile with billed minutes.',
    priority: 'high',
    status: 'in_progress',
    due_date: minutesFromNow(60 * 4),
    created_at: hoursAgo(2),
    completed_at: null,
    assigned_to: '00000000-0000-4000-a000-000000000002',
    created_by: '00000000-0000-4000-a000-000000000002',
    visibility: 'team',
    lead: { name: 'BrightVoice Receptionists', company: 'BrightVoice' },
  },
  {
    id: 'tsk-s2',
    title: 'Schedule 1:1 with Lukas re: late clock-ins',
    description: '3 late clock-ins in the last 14 days. HR escalation pending.',
    priority: 'medium',
    status: 'pending',
    due_date: minutesAgo(45),
    created_at: hoursAgo(20),
    completed_at: null,
    assigned_to: '00000000-0000-4000-a000-000000000002',
    created_by: '00000000-0000-4000-a000-000000000002',
    visibility: 'team',
    lead: null,
  },
  {
    id: 'tsk-s3',
    title: 'Approve Maya\'s Apr 1–15 shift invoice',
    description: '78.5 net hours. All breaks within policy.',
    priority: 'medium',
    status: 'pending',
    due_date: minutesFromNow(60 * 24),
    created_at: hoursAgo(10),
    completed_at: null,
    assigned_to: '00000000-0000-4000-a000-000000000002',
    created_by: '00000000-0000-4000-a000-000000000002',
    visibility: 'team',
    lead: { name: 'Maya Patel', company: null },
  },
  {
    id: 'tsk-s4',
    title: 'Review Apex Auto Body script for clarity issue',
    description: 'Agents reporting confusion on appointment booking close phrase.',
    priority: 'low',
    status: 'pending',
    due_date: null,
    created_at: hoursAgo(20),
    completed_at: null,
    assigned_to: '00000000-0000-4000-a000-000000000002',
    created_by: '00000000-0000-4000-a000-000000000002',
    visibility: 'team',
    lead: { name: 'Apex Auto Body', company: null },
  },
  {
    id: 'tsk-s5',
    title: 'Coordinate with Billing on ConnectFlow brand asset request',
    description: 'Partner wants accent color updated platform-wide.',
    priority: 'urgent',
    status: 'pending',
    due_date: minutesAgo(15),
    created_at: hoursAgo(5),
    completed_at: null,
    assigned_to: '00000000-0000-4000-a000-000000000002',
    created_by: '00000000-0000-4000-a000-000000000002',
    visibility: 'team',
    lead: { name: 'ConnectFlow', company: 'ConnectFlow' },
  },
  {
    id: 'tsk-s6',
    title: 'Complete Q2 performance reviews',
    description: 'Eleanor and Priya remaining.',
    priority: 'medium',
    status: 'in_progress',
    due_date: minutesFromNow(60 * 48),
    created_at: hoursAgo(72),
    completed_at: null,
    assigned_to: '00000000-0000-4000-a000-000000000002',
    created_by: '00000000-0000-4000-a000-000000000002',
    visibility: 'team',
    lead: null,
  },
];
