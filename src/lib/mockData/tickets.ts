import { MOCK_AGENT_ID, hoursAgo, minutesAgo } from './people';

export interface MockTicket {
  id: string;
  ticket_number: number;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'normal' | 'low';
  status: 'open' | 'in_progress' | 'pending' | 'waiting' | 'resolved' | 'closed';
  assigned_to: string | null;
  source: string;
  work_queue: 'agent' | 'supervisor';
  created_at: string;
  last_activity_at: string;
}

export const MOCK_AGENT_TICKETS: MockTicket[] = [
  {
    id: 'tic-4821',
    ticket_number: 4821,
    title: 'Probate intake — Frank Delaney (Hampton Legal)',
    priority: 'high',
    status: 'open',
    assigned_to: MOCK_AGENT_ID,
    source: 'agent',
    work_queue: 'agent',
    created_at: hoursAgo(3),
    last_activity_at: minutesAgo(35),
  },
  {
    id: 'tic-4815',
    ticket_number: 4815,
    title: 'Sterling Plumbing — emergency dispatch follow-up',
    priority: 'urgent',
    status: 'in_progress',
    assigned_to: MOCK_AGENT_ID,
    source: 'agent',
    work_queue: 'agent',
    created_at: hoursAgo(5),
    last_activity_at: minutesAgo(8),
  },
  {
    id: 'tic-4798',
    ticket_number: 4798,
    title: 'Riverside Dental — verify Cigna PPO coverage',
    priority: 'normal',
    status: 'pending',
    assigned_to: MOCK_AGENT_ID,
    source: 'agent',
    work_queue: 'agent',
    created_at: hoursAgo(28),
    last_activity_at: hoursAgo(4),
  },
  {
    id: 'tic-4776',
    ticket_number: 4776,
    title: 'Hampton Legal — awaiting signed retainer docs',
    priority: 'low',
    status: 'waiting',
    assigned_to: MOCK_AGENT_ID,
    source: 'agent',
    work_queue: 'agent',
    created_at: hoursAgo(72),
    last_activity_at: hoursAgo(14),
  },
];

export const MOCK_SUPERVISOR_TICKETS: MockTicket[] = [
  {
    id: 'tic-4830',
    ticket_number: 4830,
    title: 'ConnectFlow — partner brand color update request',
    priority: 'urgent',
    status: 'open',
    assigned_to: null,
    source: 'white_label_portal',
    work_queue: 'supervisor',
    created_at: minutesAgo(42),
    last_activity_at: minutesAgo(42),
  },
  {
    id: 'tic-4828',
    ticket_number: 4828,
    title: 'BrightVoice — disputed minutes overage ($342.50)',
    priority: 'high',
    status: 'in_progress',
    assigned_to: null,
    source: 'white_label_portal',
    work_queue: 'supervisor',
    created_at: hoursAgo(2),
    last_activity_at: minutesAgo(18),
  },
  {
    id: 'tic-4825',
    ticket_number: 4825,
    title: 'Agent flagged abusive caller — needs policy review',
    priority: 'high',
    status: 'open',
    assigned_to: null,
    source: 'internal',
    work_queue: 'supervisor',
    created_at: hoursAgo(4),
    last_activity_at: hoursAgo(1),
  },
  {
    id: 'tic-4819',
    ticket_number: 4819,
    title: 'Hampton Legal — complaint about hold time on inbound',
    priority: 'normal',
    status: 'in_progress',
    assigned_to: null,
    source: 'internal',
    work_queue: 'supervisor',
    created_at: hoursAgo(8),
    last_activity_at: hoursAgo(3),
  },
  {
    id: 'tic-4812',
    ticket_number: 4812,
    title: 'Apex Auto Body — script clarity issue on appointment booking',
    priority: 'low',
    status: 'open',
    assigned_to: null,
    source: 'internal',
    work_queue: 'supervisor',
    created_at: hoursAgo(20),
    last_activity_at: hoursAgo(20),
  },
];
