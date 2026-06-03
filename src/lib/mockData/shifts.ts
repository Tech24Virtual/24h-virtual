import { MOCK_AGENTS } from './people';

export interface MockActiveShift {
  agent_id: string;
  agent_name: string;
  status: 'active' | 'on_break' | 'idle';
  current_activity: string;
  shift_started_at: string;
  break_started_at: string | null;
  duration_label: string;
}

const minutesAgoIso = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const MOCK_ACTIVE_SHIFTS: MockActiveShift[] = [
  {
    agent_id: MOCK_AGENTS[0].id,
    agent_name: MOCK_AGENTS[0].full_name,
    status: 'active',
    current_activity: 'On chat',
    shift_started_at: minutesAgoIso(252),
    break_started_at: null,
    duration_label: '4h 12m',
  },
  {
    agent_id: MOCK_AGENTS[1].id,
    agent_name: MOCK_AGENTS[1].full_name,
    status: 'idle',
    current_activity: 'Idle 3m',
    shift_started_at: minutesAgoIso(158),
    break_started_at: null,
    duration_label: '2h 38m',
  },
  {
    agent_id: MOCK_AGENTS[2].id,
    agent_name: MOCK_AGENTS[2].full_name,
    status: 'active',
    current_activity: 'On chat',
    shift_started_at: minutesAgoIso(302),
    break_started_at: null,
    duration_label: '5h 02m',
  },
  {
    agent_id: MOCK_AGENTS[3].id,
    agent_name: MOCK_AGENTS[3].full_name,
    status: 'on_break',
    current_activity: 'On break (lunch, 18m)',
    shift_started_at: minutesAgoIso(220),
    break_started_at: minutesAgoIso(18),
    duration_label: '3h 40m',
  },
  {
    agent_id: MOCK_AGENTS[4].id,
    agent_name: MOCK_AGENTS[4].full_name,
    status: 'active',
    current_activity: 'On call',
    shift_started_at: minutesAgoIso(74),
    break_started_at: null,
    duration_label: '1h 14m',
  },
  {
    agent_id: MOCK_AGENTS[5].id,
    agent_name: MOCK_AGENTS[5].full_name,
    status: 'active',
    current_activity: 'On chat',
    shift_started_at: minutesAgoIso(407),
    break_started_at: null,
    duration_label: '6h 47m',
  },
];
