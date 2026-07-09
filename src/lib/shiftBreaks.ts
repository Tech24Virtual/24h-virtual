import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShiftBreakRow {
  started_at: string;
  ended_at: string | null;
  break_type: string | null;
}

/** Minutes to deduct from billable time when a break ends: bathroom only past its allowance, everything else in full. */
export function computeBreakEndDeductionMinutes(
  breakType: string | null,
  actualMinutes: number,
  bathroomAllowanceMinutes: number,
): number {
  return breakType === 'bathroom' ? Math.max(0, actualMinutes - bathroomAllowanceMinutes) : actualMinutes;
}

/** Admin-configured bathroom allowance (minutes of paid time before deduction kicks in). Defaults to 5. */
export function useBathroomAllowanceMinutes(): number {
  const { data } = useQuery({
    queryKey: ['bathroom-allowance-setting'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('shift_break_settings')
        .select('setting_value')
        .eq('setting_key', 'bathroom_break_allowance_minutes')
        .maybeSingle();
      return data ? parseInt(data.setting_value) : 5;
    },
  });
  return data ?? 5;
}

/** Admin-configured lunch duration default (minutes agents see pre-marked in the picker). Defaults to 30. */
export function useLunchMinutesSetting(): number {
  const { data } = useQuery({
    queryKey: ['lunch-minutes-setting'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('shift_break_settings')
        .select('setting_value')
        .eq('setting_key', 'lunch_break_minutes')
        .maybeSingle();
      return data ? parseInt(data.setting_value) : 30;
    },
  });
  return data ?? 30;
}

/**
 * Lunch breaks always deduct their full duration; bathroom breaks deduct only
 * time over the allowance. Both ignore the breaksPaid setting — only
 * unclassified ("general") breaks fall back to it.
 */
export function calcBreakDeductionMinutes(
  breaks: ShiftBreakRow[],
  bathroomAllowanceMinutes: number,
  breaksPaid: boolean,
): number {
  let deducted = 0;
  for (const b of breaks) {
    if (!b.started_at || !b.ended_at) continue;
    const mins = (new Date(b.ended_at).getTime() - new Date(b.started_at).getTime()) / 60000;
    if (b.break_type === 'lunch') {
      deducted += mins;
    } else if (b.break_type === 'bathroom') {
      deducted += Math.max(0, mins - bathroomAllowanceMinutes);
    } else if (!breaksPaid) {
      deducted += mins;
    }
  }
  return deducted;
}
