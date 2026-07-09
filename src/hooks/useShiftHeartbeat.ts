import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Records that this agent's browser is still open with an active shift, every
 * 60s, so the `auto-clockout-idle-shifts` cron can tell a genuinely abandoned
 * session (crash, closed laptop) from one that's just idle-but-open.
 *
 * Call this from every component that can be the *only* one mounted while an
 * agent is clocked in — the effect stops the moment its host component
 * unmounts, so a single call site (e.g. only the Shifts page widget) would
 * stop sending heartbeats the moment the agent navigates to do actual work,
 * causing the cron to wrongly auto-clock-out an agent who is still there.
 */
export function useShiftHeartbeat(activeShiftId: string | null | undefined) {
  useEffect(() => {
    if (!activeShiftId) return;
    const sendHeartbeat = async () => {
      await (supabase as any)
        .from('agent_shifts')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', activeShiftId)
        .is('clock_out', null);
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, [activeShiftId]);
}
