import { supabase } from '@/integrations/supabase/client';

interface TrackabiSyncPayload {
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  agent_id?: string;
  agent_email?: string;
  shift_id: string;
  timestamp: string;
  break_type?: 'bathroom' | 'lunch';
}

/** Fire-and-forget sync of a shift event to Trackabi — never blocks or surfaces errors to the agent. */
export function syncTrackabi(payload: TrackabiSyncPayload) {
  supabase.functions.invoke('trackabi-sync', { body: payload }).catch((err) => {
    console.error('Trackabi sync failed', err);
  });
}
