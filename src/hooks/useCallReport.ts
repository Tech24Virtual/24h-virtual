import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface CallSummary {
  client_id: string;
  period: string;
  total_calls: number;
  total_minutes: number;
  missed_calls: number;
  completed_calls: number;
  avg_handle_seconds: number;
  agents_used: number;
  campaigns_used: number;
}

export interface CallLogRow {
  id: string;
  client_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  caller_email: string | null;
  agent_name: string | null;
  campaign_name: string | null;
  handle_time_seconds: number | null;
  billable_minutes: number | null;
  disposition: string | null;
  status: string | null;
  call_date: string | null;
  call_time: string | null;
  created_at: string;
}

export interface DispositionCount {
  disposition: string;
  count: number;
}

export interface CallLogFilters {
  disposition?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function periodBounds(period: string): { start: string; end: string } {
  const d = new Date(period);
  return {
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
}

export function useClientCallSummary(clientId: string | null | undefined, period: string) {
  return useQuery({
    queryKey: ['call-report', 'summary', clientId, period],
    enabled: !!clientId && !!period,
    queryFn: async (): Promise<CallSummary | null> => {
      const { start, end } = periodBounds(period);
      // v_client_call_summary.period = DATE_TRUNC('month', call_date) = first day of month
      // Filter with >= start (first of month) AND <= end (last of month) to isolate the row
      const { data, error } = await (supabase as any)
        .from('v_client_call_summary')
        .select('*')
        .eq('client_id', clientId!)
        .gte('period', start)
        .lte('period', end)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useClientCallLogs(
  clientId: string | null | undefined,
  period: string,
  filters: CallLogFilters = {}
) {
  const { disposition, search, page = 0, pageSize = 20 } = filters;
  return useQuery({
    queryKey: ['call-report', 'logs', clientId, period, disposition, search, page, pageSize],
    enabled: !!clientId && !!period,
    queryFn: async (): Promise<{ rows: CallLogRow[]; count: number }> => {
      const { start, end } = periodBounds(period);
      let q = (supabase as any)
        .from('call_logs')
        .select(
          'id, client_id, caller_name, caller_phone, caller_email, agent_name, campaign_name, handle_time_seconds, billable_minutes, disposition, status, call_date, call_time, created_at',
          { count: 'exact' }
        )
        .eq('client_id', clientId!)
        .gte('call_date', start)
        .lte('call_date', end)
        .order('call_date', { ascending: false })
        .order('call_time', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (disposition) q = q.eq('disposition', disposition);
      if (search) {
        q = q.or(
          `caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%,agent_name.ilike.%${search}%,campaign_name.ilike.%${search}%,disposition.ilike.%${search}%`
        );
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data as CallLogRow[]) ?? [], count: count ?? 0 };
    },
  });
}

export function useCallDispositionBreakdown(clientId: string | null | undefined, period: string) {
  return useQuery({
    queryKey: ['call-report', 'disposition', clientId, period],
    enabled: !!clientId && !!period,
    queryFn: async (): Promise<DispositionCount[]> => {
      const { start, end } = periodBounds(period);
      const { data, error } = await (supabase as any)
        .from('call_logs')
        .select('disposition')
        .eq('client_id', clientId!)
        .gte('call_date', start)
        .lte('call_date', end);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = row.disposition || 'Unknown';
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([disposition, count]) => ({ disposition, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
}
