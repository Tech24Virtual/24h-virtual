import { hoursAgo, daysAgo } from './people';

export interface MockUnassignedClient {
  id: string;
  name: string;
  company: string | null;
  pipeline_stage: string;
  created_at: string;
}

export const MOCK_UNASSIGNED_CLIENTS: MockUnassignedClient[] = [
  {
    id: 'lead-solstice',
    name: 'Solstice Yoga Studio',
    company: 'Solstice Yoga Studio',
    pipeline_stage: 'active',
    created_at: daysAgo(2),
  },
  {
    id: 'lead-maverick',
    name: 'Maverick Roofing',
    company: 'Maverick Roofing LLC',
    pipeline_stage: 'onboarding',
    created_at: hoursAgo(4),
  },
  {
    id: 'lead-bayside',
    name: 'Bayside Notary',
    company: 'Bayside Notary Services',
    pipeline_stage: 'active',
    created_at: daysAgo(1),
  },
];
