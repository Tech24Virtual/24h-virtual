import { hoursAgo, minutesAgo, minutesFromNow } from './people';

export interface MockOutboundRequest {
  id: string;
  caller_name: string;
  caller_phone: string;
  reason: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'claimed' | 'completed' | 'failed';
  client_name: string;
  ownership: 'direct' | 'wl';
  scheduled_for: string | null;
  attempts: number;
  claimed_by: string | null;
  created_at: string;
}

export const MOCK_OUTBOUND_REQUESTS: MockOutboundRequest[] = [
  {
    id: 'out-001',
    caller_name: 'Renée Beaumont',
    caller_phone: '+1 (305) 555-0119',
    reason: 'Scheduled callback re: toddler vaccination questions',
    priority: 'normal',
    status: 'claimed',
    client_name: 'Coastal Pediatrics',
    ownership: 'direct',
    scheduled_for: minutesFromNow(45),
    attempts: 0,
    claimed_by: '00000000-0000-4000-a000-000000000001',
    created_at: minutesAgo(45),
  },
  {
    id: 'out-002',
    caller_name: 'Olivia Nguyen',
    caller_phone: '+1 (480) 555-0177',
    reason: 'URGENT — confirm AC technician dispatch ETA',
    priority: 'urgent',
    status: 'pending',
    client_name: 'Vista HVAC',
    ownership: 'wl',
    scheduled_for: null,
    attempts: 0,
    claimed_by: null,
    created_at: minutesAgo(3),
  },
  {
    id: 'out-003',
    caller_name: 'Brett Sandoval',
    caller_phone: '+1 (208) 555-0143',
    reason: 'Quote follow-up — kitchen renovation estimate',
    priority: 'normal',
    status: 'claimed',
    client_name: 'Maverick Roofing',
    ownership: 'direct',
    scheduled_for: minutesFromNow(180),
    attempts: 0,
    claimed_by: '00000000-0000-4000-a000-000000000011',
    created_at: hoursAgo(2),
  },
  {
    id: 'out-004',
    caller_name: 'Aaliyah Henderson',
    caller_phone: '+1 (713) 555-0169',
    reason: 'Could not reach on first call — left voicemail',
    priority: 'high',
    status: 'pending',
    client_name: 'Hampton Legal Group',
    ownership: 'direct',
    scheduled_for: null,
    attempts: 2,
    claimed_by: null,
    created_at: hoursAgo(4),
  },
];
