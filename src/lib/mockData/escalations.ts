import { hoursAgo, minutesAgo } from './people';

export interface MockEscalation {
  id: string;
  subject: string;
  description: string;
  target_department: 'billing' | 'admin' | 'hr' | 'sales';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  supervisor_id: string;
  related_agent_id: string | null;
  related_client_id: string | null;
}

export const MOCK_ESCALATIONS: MockEscalation[] = [
  {
    id: 'esc-001',
    subject: 'Repeated abusive caller — (415) 555-0142, need policy decision',
    description:
      'Caller has phoned 6 times in 48 hours, abusive language toward 3 different agents. Caller refuses to identify business affiliation. Need admin guidance on call-block policy or law enforcement notification.',
    target_department: 'admin',
    priority: 'urgent',
    status: 'open',
    created_at: minutesAgo(38),
    resolved_at: null,
    resolution_notes: null,
    supervisor_id: '00000000-0000-4000-a000-000000000002',
    related_agent_id: null,
    related_client_id: null,
  },
  {
    id: 'esc-002',
    subject: 'BrightVoice partner — disputed minutes overage ($342.50)',
    description:
      'Partner contesting overage charge for March cycle. Their analytics show 1,847 billed minutes; our reports show 2,114. Discrepancy of 267 minutes. Request: Billing team to reconcile and provide breakdown by client. Linked to ticket #4828.',
    target_department: 'billing',
    priority: 'high',
    status: 'open',
    created_at: hoursAgo(2),
    resolved_at: null,
    resolution_notes: null,
    supervisor_id: '00000000-0000-4000-a000-000000000002',
    related_agent_id: null,
    related_client_id: null,
  },
  {
    id: 'esc-003',
    subject: 'Lukas Berg — attendance pattern, 3 lates in 14 days',
    description:
      'Agent has clocked in late 3 times in the last 14 days (8+ minutes each). Productivity otherwise meets target. Requesting HR guidance on coaching plan vs formal write-up per policy section 4.2.',
    target_department: 'hr',
    priority: 'medium',
    status: 'open',
    created_at: hoursAgo(20),
    resolved_at: null,
    resolution_notes: null,
    supervisor_id: '00000000-0000-4000-a000-000000000002',
    related_agent_id: '00000000-0000-4000-a000-000000000013',
    related_client_id: null,
  },
];
