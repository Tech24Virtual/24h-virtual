/**
 * Realistic name pool for mock workspace data.
 */

export const MOCK_AGENT_ID = '00000000-0000-4000-a000-000000000001';
export const MOCK_SUPERVISOR_ID = '00000000-0000-4000-a000-000000000002';

export interface MockAgent {
  id: string;
  full_name: string;
  email: string;
  avatar_initial: string;
}

export const MOCK_AGENTS: MockAgent[] = [
  { id: MOCK_AGENT_ID, full_name: 'Maya Patel', email: 'maya.patel@24hvirtual.com', avatar_initial: 'MP' },
  { id: '00000000-0000-4000-a000-000000000011', full_name: 'Jordan Reyes', email: 'jordan.reyes@24hvirtual.com', avatar_initial: 'JR' },
  { id: '00000000-0000-4000-a000-000000000012', full_name: 'Aiyana Whitehorse', email: 'aiyana.whitehorse@24hvirtual.com', avatar_initial: 'AW' },
  { id: '00000000-0000-4000-a000-000000000013', full_name: 'Lukas Berg', email: 'lukas.berg@24hvirtual.com', avatar_initial: 'LB' },
  { id: '00000000-0000-4000-a000-000000000014', full_name: 'Priya Shah', email: 'priya.shah@24hvirtual.com', avatar_initial: 'PS' },
  { id: '00000000-0000-4000-a000-000000000015', full_name: 'Eleanor Voss', email: 'eleanor.voss@24hvirtual.com', avatar_initial: 'EV' },
];

export const MOCK_SUPERVISOR = {
  id: MOCK_SUPERVISOR_ID,
  full_name: 'Daniel Okafor',
  email: 'daniel.okafor@24hvirtual.com',
};

export interface MockClient {
  id: string;
  name: string;
  ownership: 'direct' | 'wl';
  partner_name?: string;
}

export const MOCK_CLIENTS: Record<string, MockClient> = {
  riverside: { id: 'cli-riverside', name: 'Riverside Dental', ownership: 'direct' },
  hampton: { id: 'cli-hampton', name: 'Hampton Legal Group', ownership: 'direct' },
  northstar: { id: 'cli-northstar', name: 'Northstar Realty', ownership: 'direct' },
  apex: { id: 'cli-apex', name: 'Apex Auto Body', ownership: 'direct' },
  coastal: { id: 'cli-coastal', name: 'Coastal Pediatrics', ownership: 'direct' },
  cedar: { id: 'cli-cedar', name: 'Cedar Veterinary', ownership: 'direct' },
  sterling: { id: 'cli-sterling', name: 'Sterling Plumbing', ownership: 'wl', partner_name: 'BrightVoice Receptionists' },
  greenleaf: { id: 'cli-greenleaf', name: 'GreenLeaf Landscaping', ownership: 'wl', partner_name: 'ConnectFlow' },
  vista: { id: 'cli-vista', name: 'Vista HVAC', ownership: 'wl', partner_name: 'BrightVoice Receptionists' },
};

// minutes ago helper
export const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString();
export const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
export const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
export const minutesFromNow = (n: number) => new Date(Date.now() + n * 60 * 1000).toISOString();
